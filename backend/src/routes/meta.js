const express = require('express');
const router = express.Router();
const { runQuery } = require('../config/neo4j');

// GET /api/meta/locations
router.get('/locations', async (req, res) => {
  try {
    const cypher = `
      MATCH (l:Location)
      RETURN coalesce(l.locationId, id(l)) AS LocationID,
             coalesce(l.area, l.city, l.address, 'Location') AS Name,
             coalesce(l.city, '') AS City,
             coalesce(l.state, '') AS State
      ORDER BY Name ASC
    `;
    const records = await runQuery(cypher);
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/meta/users
router.get('/users', async (req, res) => {
  try {
    const cypher = `
      MATCH (u:User)
      RETURN coalesce(u.userId, id(u)) AS UserID,
             coalesce(u.fullName, 'User') AS Name,
             coalesce(u.email, '') AS Email
      ORDER BY Name ASC
    `;
    const records = await runQuery(cypher);
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/meta/disasters
router.get('/disasters', async (req, res) => {
  try {
    const cypher = `
      MATCH (d:Disaster)
      RETURN coalesce(d.disasterId, id(d)) AS DisasterID,
             coalesce(d.disasterName, d.disasterType, 'Disaster') AS Type,
             coalesce(d.status, 'Active') AS Status,
             coalesce(d.severity, 'Medium') AS Severity
      ORDER BY DisasterID ASC
    `;
    const records = await runQuery(cypher);
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/meta/volunteers
router.get('/volunteers', async (req, res) => {
  try {
    const cypher = `
      MATCH (v:Volunteer)
      OPTIONAL MATCH (u:User)-[:HAS_VOLUNTEER_PROFILE]->(v)
      RETURN coalesce(v.volunteerId, id(v)) AS VolunteerID,
             coalesce(u.fullName, 'Volunteer ' + toString(v.volunteerId)) AS Name,
             coalesce(v.availability, 'Available') AS Availability
      ORDER BY Name ASC
    `;
    const records = await runQuery(cypher);
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/meta/requests
router.get('/requests', async (req, res) => {
  try {
    const cypher = `
      MATCH (r:Request)
      RETURN coalesce(r.requestId, id(r)) AS RequestID,
             coalesce(r.requestType, 'Request') AS Type,
             coalesce(r.priority, 'Medium') AS Priority,
             coalesce(r.status, 'Pending') AS Status
      ORDER BY RequestID DESC
    `;
    const records = await runQuery(cypher);
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
