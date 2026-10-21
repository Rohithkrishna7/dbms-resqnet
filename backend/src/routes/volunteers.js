const express = require('express');
const router = express.Router();
const { runQuery } = require('../config/neo4j');

// GET /api/volunteers - List all volunteers (client-side filtering handles search/availability)
router.get('/', async (req, res) => {
  try {
    // Always return all volunteers. Client applies search and availability filter.
    const cypher = `
      MATCH (v:Volunteer)
      OPTIONAL MATCH (u:User)-[:HAS_VOLUNTEER_PROFILE]->(v)
      OPTIONAL MATCH (v)-[a:ASSIGNED_TO]->(r:Request)
      WITH v, u,
           collect(CASE WHEN a IS NOT NULL THEN {
             AssignmentID: coalesce(a.assignmentId, id(a)),
             Status: coalesce(a.status, 'Assigned'),
             AssignedDate: coalesce(toString(r.requestTime), 'N/A'),
             RequestID: coalesce(r.requestId, ''),
             RequestType: coalesce(r.requestType, '')
           } ELSE null END) AS rawAssignments
      RETURN coalesce(v.volunteerId, id(v)) AS VolunteerID,
             coalesce(u.fullName, 'Volunteer ' + toString(v.volunteerId)) AS Name,
             coalesce(u.userId, '') AS UserID,
             coalesce(u.email, '') AS Email,
             coalesce(u.phone, '') AS Phone,
             coalesce(v.availability, 'Available') AS Availability,
             'Emergency Response Operations' AS Skills,
             coalesce(toString(v.experienceYears) + ' years', 'Beginner') AS Experience,
             [assign IN rawAssignments WHERE assign IS NOT NULL] AS assignments
      ORDER BY VolunteerID ASC
    `;

    const records = await runQuery(cypher, {});
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    console.error('Error fetching volunteers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/volunteers/available-experienced - Advanced Query 2: Available and experienced volunteers
router.get('/available-experienced', async (req, res) => {
  try {
    const availability = (req.query.availability || 'Available').trim();
    const minExpParam = req.query.minExperience !== undefined ? req.query.minExperience : '1';
    const minExperience = Number(minExpParam);

    if (isNaN(minExperience) || minExperience < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid minExperience parameter. Must be a non-negative number.'
      });
    }

    const cypher = `
      MATCH (v:Volunteer)
      WHERE toLower(coalesce(v.availability, '')) = toLower($availability)
        AND coalesce(v.experienceYears, 0) >= $minExperience
      OPTIONAL MATCH (u:User)-[:HAS_VOLUNTEER_PROFILE]->(v)
      OPTIONAL MATCH (v)-[a:ASSIGNED_TO]->(r:Request)
      WITH v, u,
           count(CASE WHEN a IS NOT NULL AND NOT toLower(coalesce(a.status, '')) IN ['completed', 'resolved', 'cancelled'] THEN 1 END) AS activeAssignments,
           count(a) AS assignmentCount
      RETURN coalesce(v.volunteerId, id(v)) AS VolunteerID,
             coalesce(u.fullName, 'Volunteer ' + toString(v.volunteerId)) AS Name,
             coalesce(u.userId, '') AS UserID,
             coalesce(u.email, '') AS Email,
             coalesce(u.phone, '') AS Phone,
             coalesce(v.availability, 'Available') AS Availability,
             coalesce(v.experienceYears, 0) AS ExperienceYears,
             coalesce(toString(v.experienceYears) + ' years', '0 years') AS Experience,
             activeAssignments,
             assignmentCount
      ORDER BY ExperienceYears DESC, VolunteerID ASC
    `;

    const records = await runQuery(cypher, { availability, minExperience });
    res.json({
      success: true,
      query: 'Available and experienced volunteers',
      parameters: { availability, minExperience },
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('Error fetching available experienced volunteers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/volunteers/multiple-assignments - Advanced Query 3: Volunteers with multiple assignments
router.get('/multiple-assignments', async (req, res) => {
  try {
    const minParam = req.query.minAssignments !== undefined ? req.query.minAssignments : '2';
    const minAssignments = parseInt(minParam, 10);

    if (isNaN(minAssignments) || minAssignments < 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid minAssignments parameter. Must be an integer >= 2.'
      });
    }

    const cypher = `
      MATCH (v:Volunteer)-[a:ASSIGNED_TO]->(r:Request)
      OPTIONAL MATCH (u:User)-[:HAS_VOLUNTEER_PROFILE]->(v)
      WITH v, u, count(a) AS assignmentCount,
           collect({
             AssignmentID: coalesce(a.assignmentId, id(a)),
             Status: coalesce(a.status, 'Assigned'),
             RequestID: coalesce(r.requestId, id(r)),
             RequestType: coalesce(r.requestType, 'General')
           }) AS assignments
      WHERE assignmentCount >= $minAssignments
      RETURN coalesce(v.volunteerId, id(v)) AS VolunteerID,
             coalesce(u.fullName, 'Volunteer ' + toString(v.volunteerId)) AS Name,
             coalesce(u.userId, '') AS UserID,
             coalesce(u.email, '') AS Email,
             coalesce(u.phone, '') AS Phone,
             coalesce(v.availability, 'Deployed') AS Availability,
             coalesce(v.experienceYears, 0) AS ExperienceYears,
             assignmentCount,
             assignments
      ORDER BY assignmentCount DESC, VolunteerID ASC
    `;

    const records = await runQuery(cypher, { minAssignments });
    res.json({
      success: true,
      query: 'Volunteers with multiple assignments',
      parameters: { minAssignments },
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('Error fetching volunteers with multiple assignments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/volunteers/:id/availability - Update volunteer availability
router.patch('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { availability } = req.body;

    if (!availability) {
      return res.status(400).json({ success: false, error: 'Availability value is required.' });
    }

    const validValues = ['Available', 'Deployed', 'Unavailable', 'On Leave'];
    const formatted = validValues.find(v => v.toLowerCase() === availability.toLowerCase()) || availability;

    const cypher = `
      MATCH (v:Volunteer)
      WHERE v.volunteerId = toInteger($id) OR toString(v.volunteerId) = $id
      SET v.availability = $formatted
      RETURN coalesce(v.volunteerId, id(v)) AS VolunteerID,
             v.availability AS Availability
    `;

    const result = await runQuery(cypher, { id, formatted });
    if (result.length === 0) {
      return res.status(404).json({ success: false, error: 'Volunteer not found' });
    }

    res.json({
      success: true,
      message: `Volunteer availability updated to "${formatted}"`,
      data: result[0]
    });
  } catch (error) {
    console.error('Error updating volunteer availability:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
