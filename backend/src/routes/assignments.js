const express = require('express');
const router = express.Router();
const { runQuery } = require('../config/neo4j');

// GET /api/assignments - List all assignments (client-side filtering handles search/status)
router.get('/', async (req, res) => {
  try {
    // Always return all assignments. WHERE after OPTIONAL MATCH chains in Cypher
    // does not correctly filter the base MATCH — handled client-side instead.
    const cypher = `
      MATCH (v:Volunteer)-[a:ASSIGNED_TO]->(r:Request)
      OPTIONAL MATCH (vu:User)-[:HAS_VOLUNTEER_PROFILE]->(v)
      OPTIONAL MATCH (r)-[:AT_LOCATION]->(l:Location)
      OPTIONAL MATCH (r)-[:RELATED_TO]->(d:Disaster)
      RETURN coalesce(a.assignmentId, id(a)) AS AssignmentID,
             coalesce(toString(r.requestTime), 'N/A') AS AssignedDate,
             coalesce(a.status, 'Assigned') AS Status,
             coalesce(v.volunteerId, '') AS VolunteerID,
             coalesce(vu.fullName, 'Volunteer ' + toString(v.volunteerId)) AS VolunteerName,
             coalesce(r.requestId, '') AS RequestID,
             coalesce(r.requestType, 'Relief Request') AS RequestType,
             coalesce(r.priority, 'Medium') AS RequestPriority,
             coalesce(l.area, l.city, l.address, '') AS LocationName,
             coalesce(d.disasterType, '') AS DisasterType
      ORDER BY AssignmentID ASC
    `;

    const records = await runQuery(cypher, {});
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/assignments - Create assignment with strict validation of volunteer and request existence
router.post('/', async (req, res) => {
  try {
    const { AssignmentID, VolunteerID, RequestID, Status, AssignedDate } = req.body;

    if (!AssignmentID || !VolunteerID || !RequestID) {
      return res.status(400).json({
        success: false,
        error: 'AssignmentID, VolunteerID, and RequestID are all required.'
      });
    }

    const cleanAssignmentID = String(AssignmentID).trim();
    const cleanVolunteerID = String(VolunteerID).trim();
    const cleanRequestID = String(RequestID).trim();

    // 1. Verify AssignmentID uniqueness on ASSIGNED_TO relationship
    const checkAssignment = await runQuery(
      `MATCH ()-[a:ASSIGNED_TO]->() WHERE a.assignmentId = toInteger($id) OR toString(a.assignmentId) = $id RETURN a LIMIT 1`,
      { id: cleanAssignmentID }
    );
    if (checkAssignment.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Assignment with ID "${cleanAssignmentID}" already exists.`
      });
    }

    // 2. Validate Volunteer exists
    const checkVolunteer = await runQuery(
      `MATCH (v:Volunteer) WHERE v.volunteerId = toInteger($id) OR toString(v.volunteerId) = $id RETURN v LIMIT 1`,
      { id: cleanVolunteerID }
    );
    if (checkVolunteer.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Volunteer with ID "${cleanVolunteerID}" does not exist in the database.`
      });
    }

    // 3. Validate Request exists
    const checkRequest = await runQuery(
      `MATCH (r:Request) WHERE r.requestId = toInteger($id) OR toString(r.requestId) = $id RETURN r LIMIT 1`,
      { id: cleanRequestID }
    );
    if (checkRequest.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Emergency Request with ID "${cleanRequestID}" does not exist in the database.`
      });
    }

    // 4. Create ASSIGNED_TO relationship and update states
    const parsedAssignmentId = isNaN(Number(cleanAssignmentID)) ? cleanAssignmentID : Number(cleanAssignmentID);
    const createCypher = `
      MATCH (v:Volunteer) WHERE v.volunteerId = toInteger($VolunteerID) OR toString(v.volunteerId) = $VolunteerID
      MATCH (r:Request) WHERE r.requestId = toInteger($RequestID) OR toString(r.requestId) = $RequestID
      CREATE (v)-[a:ASSIGNED_TO {
        assignmentId: $parsedAssignmentId,
        status: $Status
      }]->(r)
      SET r.status = CASE WHEN r.status = 'Pending' THEN 'In Progress' ELSE r.status END
      SET v.availability = 'Deployed'
      RETURN a.assignmentId AS AssignmentID, a.status AS Status, coalesce(toString(r.requestTime), 'N/A') AS AssignedDate
    `;

    const params = {
      parsedAssignmentId,
      VolunteerID: cleanVolunteerID,
      RequestID: cleanRequestID,
      Status: String(Status || 'Assigned').trim()
    };

    const result = await runQuery(createCypher, params);
    res.status(201).json({
      success: true,
      message: 'Assignment successfully created and connected to volunteer and request.',
      data: result[0]
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/assignments/:id/status - Update assignment status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required.' });
    }

    const validStatuses = ['Assigned', 'In Progress', 'Completed', 'Cancelled'];
    const formattedStatus = validStatuses.find(s => s.toLowerCase() === status.toLowerCase()) || status;

    const cypher = `
      MATCH ()-[a:ASSIGNED_TO]->()
      WHERE a.assignmentId = toInteger($id) OR toString(a.assignmentId) = $id
      SET a.status = $formattedStatus
      RETURN a.assignmentId AS AssignmentID,
             a.status AS Status
    `;

    const result = await runQuery(cypher, { id, formattedStatus });
    if (result.length === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found.' });
    }

    res.json({
      success: true,
      message: `Assignment status updated to "${formattedStatus}"`,
      data: result[0]
    });
  } catch (error) {
    console.error('Error updating assignment status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
