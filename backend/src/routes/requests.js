const express = require('express');
const router = express.Router();
const { runQuery } = require('../config/neo4j');

// GET /api/requests - List all requests (filtering handled client-side for reliability)
router.get('/', async (req, res) => {
  try {
    // Always fetch all requests; client applies search/filter/sort on the result array.
    // Server-side Cypher WHERE after OPTIONAL MATCH chains is unreliable with the
    // current schema, so we return the full set and let the frontend filter.
    const cypher = `
      MATCH (r:Request)
      OPTIONAL MATCH (r)-[:RELATED_TO]->(d:Disaster)
      OPTIONAL MATCH (r)-[:AT_LOCATION]->(l:Location)
      OPTIONAL MATCH (u:User)-[:SUBMITTED]->(r)
      OPTIONAL MATCH (v:Volunteer)-[a:ASSIGNED_TO]->(r)
      OPTIONAL MATCH (vu:User)-[:HAS_VOLUNTEER_PROFILE]->(v)
      RETURN coalesce(r.requestId, id(r)) AS RequestID,
             coalesce(r.requestType, 'Relief Request') AS Type,
             coalesce(r.description, '') AS Description,
             coalesce(r.priority, 'Medium') AS Priority,
             coalesce(r.status, 'Pending') AS Status,
             coalesce(toString(r.requestTime), 'N/A') AS RequestDate,
             coalesce(u.userId, '') AS RequesterID,
             coalesce(u.fullName, 'Anonymous') AS RequesterName,
             coalesce(d.disasterId, '') AS DisasterID,
             coalesce(d.disasterName, d.disasterType, 'None') AS DisasterName,
             coalesce(l.locationId, '') AS LocationID,
             coalesce(l.area, l.city, l.address, 'Unknown') AS LocationName,
             coalesce(a.assignmentId, '') AS AssignmentID,
             coalesce(vu.fullName, '') AS AssignedVolunteerName
      ORDER BY RequestID DESC
    `;

    const records = await runQuery(cypher, {});
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    console.error('Error fetching emergency requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/requests/critical-active - Advanced Query 1: Critical pending requests for active disasters
router.get('/critical-active', async (req, res) => {
  try {
    const priority = (req.query.priority || 'Critical').trim();
    const status = (req.query.status || 'Pending').trim();

    // Strictly filters for active disasters (status = 'Active') case-insensitively
    const cypher = `
      MATCH (r:Request)-[:RELATED_TO]->(d:Disaster)
      WHERE toLower(coalesce(r.priority, '')) = toLower($priority)
        AND toLower(coalesce(r.status, '')) = toLower($status)
        AND toLower(coalesce(d.status, '')) = 'active'
      OPTIONAL MATCH (r)-[:AT_LOCATION]->(l:Location)
      OPTIONAL MATCH (u:User)-[:SUBMITTED]->(r)
      RETURN coalesce(r.requestId, id(r)) AS RequestID,
             coalesce(r.requestType, 'Relief Request') AS Type,
             coalesce(r.description, '') AS Description,
             coalesce(r.priority, 'Critical') AS Priority,
             coalesce(r.status, 'Pending') AS Status,
             coalesce(toString(r.requestTime), 'N/A') AS RequestDate,
             coalesce(d.disasterId, '') AS DisasterID,
             coalesce(d.disasterName, d.disasterType, 'Unknown Disaster') AS DisasterName,
             coalesce(d.status, 'Active') AS DisasterStatus,
             coalesce(d.severity, '') AS DisasterSeverity,
             coalesce(l.locationId, '') AS LocationID,
             coalesce(l.area, l.city, l.address, 'Unknown') AS LocationName,
             coalesce(l.city, '') AS LocationCity,
             coalesce(l.state, '') AS LocationState,
             coalesce(u.userId, '') AS RequesterID,
             coalesce(u.fullName, 'Anonymous') AS RequesterName
      ORDER BY RequestID DESC
    `;

    const records = await runQuery(cypher, { priority, status });
    res.json({
      success: true,
      query: 'Critical pending requests for active disasters',
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('Error fetching critical active requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/requests/unassigned - Advanced Query 4: Requests needing assignment (unassigned to any volunteer)
router.get('/unassigned', async (req, res) => {
  try {
    const includeResolved = req.query.includeResolved === 'true' || req.query.all === 'true';

    let cypher = `
      MATCH (r:Request)
      WHERE NOT ()-[:ASSIGNED_TO]->(r)
    `;

    if (!includeResolved) {
      // Exclude Resolved and Cancelled requests to specifically target requests awaiting volunteer assignment
      cypher += ` AND NOT toLower(coalesce(r.status, '')) IN ['resolved', 'cancelled']`;
    }

    cypher += `
      OPTIONAL MATCH (r)-[:RELATED_TO]->(d:Disaster)
      OPTIONAL MATCH (r)-[:AT_LOCATION]->(l:Location)
      OPTIONAL MATCH (u:User)-[:SUBMITTED]->(r)
      RETURN coalesce(r.requestId, id(r)) AS RequestID,
             coalesce(r.requestType, 'Relief Request') AS Type,
             coalesce(r.description, '') AS Description,
             coalesce(r.priority, 'Medium') AS Priority,
             coalesce(r.status, 'Pending') AS Status,
             coalesce(toString(r.requestTime), 'N/A') AS RequestDate,
             coalesce(d.disasterId, '') AS DisasterID,
             coalesce(d.disasterName, d.disasterType, 'None') AS DisasterName,
             coalesce(d.status, '') AS DisasterStatus,
             coalesce(l.locationId, '') AS LocationID,
             coalesce(l.area, l.city, l.address, 'Unknown') AS LocationName,
             coalesce(l.city, '') AS LocationCity,
             coalesce(u.userId, '') AS RequesterID,
             coalesce(u.fullName, 'Anonymous') AS RequesterName
      ORDER BY RequestID DESC
    `;

    const records = await runQuery(cypher, {});
    res.json({
      success: true,
      query: includeResolved
        ? 'All requests without an assigned volunteer'
        : 'Requests needing assignment (unassigned, excluding resolved/cancelled)',
      filter: {
        unassignedOnly: true,
        excludedStatuses: includeResolved ? [] : ['Resolved', 'Cancelled']
      },
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('Error fetching unassigned requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/requests/:id - Single request details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const cypher = `
      MATCH (r:Request)
      WHERE r.requestId = toInteger($id) OR toString(r.requestId) = $id OR toString(id(r)) = $id
      OPTIONAL MATCH (r)-[:RELATED_TO]->(d:Disaster)
      OPTIONAL MATCH (r)-[:AT_LOCATION]->(l:Location)
      OPTIONAL MATCH (u:User)-[:SUBMITTED]->(r)
      OPTIONAL MATCH (v:Volunteer)-[a:ASSIGNED_TO]->(r)
      OPTIONAL MATCH (vu:User)-[:HAS_VOLUNTEER_PROFILE]->(v)
      RETURN coalesce(r.requestId, id(r)) AS RequestID,
             coalesce(r.requestType, 'Relief Request') AS Type,
             coalesce(r.description, '') AS Description,
             coalesce(r.priority, 'Medium') AS Priority,
             coalesce(r.status, 'Pending') AS Status,
             coalesce(toString(r.requestTime), 'N/A') AS RequestDate,
             coalesce(u.userId, '') AS RequesterID,
             coalesce(u.fullName, 'Anonymous') AS RequesterName,
             coalesce(u.email, '') AS RequesterEmail,
             coalesce(d.disasterId, '') AS DisasterID,
             coalesce(d.disasterName, d.disasterType, 'None') AS DisasterName,
             coalesce(d.severity, '') AS DisasterSeverity,
             coalesce(l.locationId, '') AS LocationID,
             coalesce(l.area, l.city, l.address, '') AS LocationName,
             coalesce(l.city, '') AS LocationCity,
             coalesce(a.assignmentId, '') AS AssignmentID,
             coalesce(a.status, '') AS AssignmentStatus,
             coalesce(v.volunteerId, '') AS VolunteerID,
             coalesce(vu.fullName, '') AS VolunteerName
      LIMIT 1
    `;

    const records = await runQuery(cypher, { id });
    if (records.length === 0) {
      return res.status(404).json({ success: false, error: 'Emergency request not found' });
    }

    res.json({ success: true, data: records[0] });
  } catch (error) {
    console.error('Error fetching request detail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/requests - Create request
router.post('/', async (req, res) => {
  try {
    const { RequestID, Type, Description, Priority, Status, UserID, DisasterID, LocationID } = req.body;

    if (!RequestID || !Type) {
      return res.status(400).json({
        success: false,
        error: 'RequestID and Type are required fields.'
      });
    }

    const cleanId = String(RequestID).trim();
    const checkQuery = `
      MATCH (r:Request)
      WHERE r.requestId = toInteger($RequestID) OR toString(r.requestId) = $RequestID
      RETURN r LIMIT 1
    `;
    const existing = await runQuery(checkQuery, { RequestID: cleanId });
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Emergency Request with ID "${RequestID}" already exists.`
      });
    }

    let parsedId = isNaN(Number(cleanId)) ? cleanId : Number(cleanId);

    let createQuery = `
      CREATE (r:Request {
        requestId: $parsedId,
        requestType: $Type,
        description: $Description,
        priority: $Priority,
        status: $Status,
        requestTime: datetime()
      })
    `;

    const params = {
      parsedId,
      Type: String(Type).trim(),
      Description: String(Description || '').trim(),
      Priority: String(Priority || 'Medium').trim(),
      Status: String(Status || 'Pending').trim()
    };

    if (UserID) {
      createQuery += `
        WITH r
        OPTIONAL MATCH (u:User)
        WHERE u.userId = toInteger($UserID) OR toString(u.userId) = $UserID
        FOREACH (_ IN CASE WHEN u IS NOT NULL THEN [1] ELSE [] END |
          CREATE (u)-[:SUBMITTED]->(r)
        )
      `;
      params.UserID = String(UserID).trim();
    }

    if (DisasterID) {
      createQuery += `
        WITH r
        OPTIONAL MATCH (d:Disaster)
        WHERE d.disasterId = toInteger($DisasterID) OR toString(d.disasterId) = $DisasterID
        FOREACH (_ IN CASE WHEN d IS NOT NULL THEN [1] ELSE [] END |
          CREATE (r)-[:RELATED_TO]->(d)
        )
      `;
      params.DisasterID = String(DisasterID).trim();
    }

    if (LocationID) {
      createQuery += `
        WITH r
        OPTIONAL MATCH (l:Location)
        WHERE l.locationId = toInteger($LocationID) OR toString(l.locationId) = $LocationID
        FOREACH (_ IN CASE WHEN l IS NOT NULL THEN [1] ELSE [] END |
          CREATE (r)-[:AT_LOCATION]->(l)
        )
      `;
      params.LocationID = String(LocationID).trim();
    }

    createQuery += `
      RETURN coalesce(r.requestId, id(r)) AS RequestID,
             r.requestType AS Type,
             r.priority AS Priority,
             r.status AS Status,
             r.description AS Description
    `;

    const result = await runQuery(createQuery, params);
    res.status(201).json({
      success: true,
      message: 'Emergency request created successfully',
      data: result[0]
    });
  } catch (error) {
    console.error('Error creating emergency request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/requests/:id/status - Update request status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const validStatuses = ['Pending', 'In Progress', 'Assigned', 'Resolved', 'Cancelled'];
    const formattedStatus = validStatuses.find(s => s.toLowerCase() === status.toLowerCase()) || status;

    const cypher = `
      MATCH (r:Request)
      WHERE r.requestId = toInteger($id) OR toString(r.requestId) = $id
      SET r.status = $formattedStatus
      RETURN coalesce(r.requestId, id(r)) AS RequestID, r.status AS Status
    `;

    const result = await runQuery(cypher, { id, formattedStatus });
    if (result.length === 0) {
      return res.status(404).json({ success: false, error: 'Emergency request not found' });
    }

    res.json({
      success: true,
      message: `Request status updated to "${formattedStatus}"`,
      data: result[0]
    });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
