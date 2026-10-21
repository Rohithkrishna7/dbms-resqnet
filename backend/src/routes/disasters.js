const express = require('express');
const router = express.Router();
const { runQuery } = require('../config/neo4j');

// GET /api/disasters - List all disasters (client-side filtering handles search/status/severity)
router.get('/', async (req, res) => {
  try {
    // Always return all disasters. Client applies search, status, severity filters.
    const cypher = `
      MATCH (d:Disaster)
      OPTIONAL MATCH (d)-[:LOCATED_AT]->(l:Location)
      OPTIONAL MATCH (r:Request)-[:RELATED_TO]->(d)
      WITH d, l, count(r) AS requestCount
      RETURN coalesce(d.disasterId, id(d)) AS DisasterID,
             coalesce(d.disasterType, 'Unknown') AS Type,
             coalesce(d.disasterName, d.disasterType, '') AS Name,
             coalesce(d.severity, 'Medium') AS Severity,
             coalesce(d.status, 'Active') AS Status,
             coalesce(toString(d.startDate), 'N/A') AS StartDate,
             coalesce(toString(d.endDate), '') AS EndDate,
             coalesce(d.disasterName, d.disasterType, '') AS Description,
             coalesce(l.locationId, '') AS LocationID,
             coalesce(l.area, l.city, l.address, 'Unassigned') AS LocationName,
             coalesce(l.city, '') AS LocationCity,
             coalesce(l.state, '') AS LocationState,
             requestCount
      ORDER BY DisasterID ASC
    `;

    const records = await runQuery(cypher, {});
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    console.error('Error fetching disasters:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/disasters/:id - Detail view with related emergency requests
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const disasterQuery = `
      MATCH (d:Disaster)
      WHERE d.disasterId = toInteger($id) OR toString(d.disasterId) = $id OR toString(id(d)) = $id
      OPTIONAL MATCH (d)-[:LOCATED_AT]->(l:Location)
      RETURN coalesce(d.disasterId, id(d)) AS DisasterID,
             coalesce(d.disasterType, 'Unknown') AS Type,
             coalesce(d.disasterName, d.disasterType, '') AS Name,
             coalesce(d.severity, 'Medium') AS Severity,
             coalesce(d.status, 'Active') AS Status,
             coalesce(toString(d.startDate), 'N/A') AS StartDate,
             coalesce(toString(d.endDate), '') AS EndDate,
             coalesce(d.disasterName, d.disasterType, '') AS Description,
             coalesce(l.locationId, '') AS LocationID,
             coalesce(l.area, l.city, l.address, 'Unassigned') AS LocationName,
             coalesce(l.city, '') AS LocationCity,
             coalesce(l.state, '') AS LocationState
      LIMIT 1
    `;

    const requestsQuery = `
      MATCH (r:Request)-[:RELATED_TO]->(d:Disaster)
      WHERE d.disasterId = toInteger($id) OR toString(d.disasterId) = $id OR toString(id(d)) = $id
      OPTIONAL MATCH (u:User)-[:SUBMITTED]->(r)
      OPTIONAL MATCH (r)-[:AT_LOCATION]->(l:Location)
      RETURN coalesce(r.requestId, id(r)) AS RequestID,
             coalesce(r.requestType, 'General') AS Type,
             coalesce(r.priority, 'Medium') AS Priority,
             coalesce(r.status, 'Pending') AS Status,
             coalesce(r.description, '') AS Description,
             coalesce(toString(r.requestTime), '') AS RequestDate,
             coalesce(u.fullName, 'Anonymous') AS RequesterName,
             coalesce(l.area, l.city, l.address, '') AS LocationName
      ORDER BY RequestID DESC
    `;

    const [disasterRes, requestsRes] = await Promise.all([
      runQuery(disasterQuery, { id }),
      runQuery(requestsQuery, { id })
    ]);

    if (!disasterRes || disasterRes.length === 0) {
      return res.status(404).json({ success: false, error: 'Disaster record not found' });
    }

    const disaster = disasterRes[0];
    disaster.relatedRequests = requestsRes;

    res.json({ success: true, data: disaster });
  } catch (error) {
    console.error('Error fetching disaster details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/disasters - Create disaster record
router.post('/', async (req, res) => {
  try {
    const { DisasterID, Type, Severity, Status, StartDate, Description, LocationID } = req.body;

    if (!DisasterID || !Type || !Severity) {
      return res.status(400).json({
        success: false,
        error: 'DisasterID, Type, and Severity are required fields.'
      });
    }

    // Check if ID already exists
    const checkQuery = `
      MATCH (d:Disaster)
      WHERE d.disasterId = toInteger($DisasterID) OR toString(d.disasterId) = $DisasterID
      RETURN d LIMIT 1
    `;
    const cleanId = String(DisasterID).trim();
    const existing = await runQuery(checkQuery, { DisasterID: cleanId });
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Disaster with ID "${DisasterID}" already exists.`
      });
    }

    let parsedId = isNaN(Number(cleanId)) ? cleanId : Number(cleanId);
    let dateVal = StartDate ? String(StartDate).trim() : new Date().toISOString().split('T')[0];

    let createQuery = `
      CREATE (d:Disaster {
        disasterId: $parsedId,
        disasterName: $disasterName,
        disasterType: $disasterType,
        severity: $severity,
        status: $status,
        startDate: date($dateVal)
      })
    `;

    const params = {
      parsedId,
      disasterName: Description ? String(Description).trim() : `${String(Type).trim()} Incident`,
      disasterType: String(Type).trim(),
      severity: String(Severity).trim(),
      status: String(Status || 'Active').trim(),
      dateVal
    };

    if (LocationID) {
      createQuery += `
        WITH d
        OPTIONAL MATCH (l:Location)
        WHERE l.locationId = toInteger($LocationID) OR toString(l.locationId) = $LocationID
        FOREACH (_ IN CASE WHEN l IS NOT NULL THEN [1] ELSE [] END |
          CREATE (d)-[:LOCATED_AT]->(l)
        )
      `;
      params.LocationID = String(LocationID).trim();
    }

    createQuery += `
      RETURN coalesce(d.disasterId, id(d)) AS DisasterID,
             d.disasterType AS Type,
             d.severity AS Severity,
             d.status AS Status,
             toString(d.startDate) AS StartDate,
             d.disasterName AS Description
    `;

    const result = await runQuery(createQuery, params);
    res.status(201).json({
      success: true,
      message: 'Disaster record created successfully',
      data: result[0]
    });
  } catch (error) {
    console.error('Error creating disaster:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/disasters/:id - Update disaster record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Type, Severity, Status, StartDate, Description, LocationID } = req.body;

    const findQuery = `
      MATCH (d:Disaster)
      WHERE d.disasterId = toInteger($id) OR toString(d.disasterId) = $id
      RETURN d LIMIT 1
    `;
    const check = await runQuery(findQuery, { id });
    if (check.length === 0) {
      return res.status(404).json({ success: false, error: 'Disaster record not found' });
    }

    let updateQuery = `
      MATCH (d:Disaster)
      WHERE d.disasterId = toInteger($id) OR toString(d.disasterId) = $id
      SET d.disasterType = coalesce($Type, d.disasterType),
          d.severity = coalesce($Severity, d.severity),
          d.status = coalesce($Status, d.status),
          d.disasterName = coalesce($Description, d.disasterName)
    `;

    const params = {
      id,
      Type: Type !== undefined ? String(Type).trim() : null,
      Severity: Severity !== undefined ? String(Severity).trim() : null,
      Status: Status !== undefined ? String(Status).trim() : null,
      Description: Description !== undefined ? String(Description).trim() : null
    };

    if (StartDate) {
      updateQuery += `, d.startDate = date($StartDate)`;
      params.StartDate = String(StartDate).trim();
    }

    if (LocationID !== undefined) {
      updateQuery += `
        WITH d
        OPTIONAL MATCH (d)-[oldRel:LOCATED_AT]->(:Location)
        DELETE oldRel
        WITH d
        OPTIONAL MATCH (newL:Location)
        WHERE newL.locationId = toInteger($LocationID) OR toString(newL.locationId) = $LocationID
        FOREACH (_ IN CASE WHEN newL IS NOT NULL THEN [1] ELSE [] END |
          CREATE (d)-[:LOCATED_AT]->(newL)
        )
      `;
      params.LocationID = String(LocationID).trim();
    }

    updateQuery += `
      RETURN coalesce(d.disasterId, id(d)) AS DisasterID,
             d.disasterType AS Type,
             d.severity AS Severity,
             d.status AS Status,
             toString(d.startDate) AS StartDate,
             d.disasterName AS Description
    `;

    const result = await runQuery(updateQuery, params);
    res.json({
      success: true,
      message: 'Disaster updated successfully',
      data: result[0]
    });
  } catch (error) {
    console.error('Error updating disaster:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
