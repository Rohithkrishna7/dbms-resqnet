const express = require('express');
const router = express.Router();
const { runQuery } = require('../config/neo4j');

router.get('/summary', async (req, res) => {
  try {
    // 1. KPI Counts
    const kpiQuery = `
      MATCH (d:Disaster)
      WITH count(d) AS totalDisasters,
           count(CASE WHEN toLower(coalesce(d.status, '')) IN ['active', 'ongoing', 'critical', 'open', 'alert'] THEN 1 END) AS activeDisasters
      MATCH (r:Request)
      WITH totalDisasters, activeDisasters,
           count(r) AS totalRequests,
           count(CASE WHEN toLower(coalesce(r.status, '')) IN ['pending', 'open', 'unassigned'] THEN 1 END) AS pendingRequests
      MATCH (v:Volunteer)
      WITH totalDisasters, activeDisasters, totalRequests, pendingRequests,
           count(v) AS totalVolunteers,
           count(CASE WHEN toLower(coalesce(v.availability, '')) IN ['available', 'yes', 'true', 'ready'] THEN 1 END) AS availableVolunteers
      MATCH ()-[s:STOCKED_AT]->()
      WITH totalDisasters, activeDisasters, totalRequests, pendingRequests, totalVolunteers, availableVolunteers,
           count(s) AS totalInventoryItems,
           coalesce(sum(coalesce(s.quantity, 0)), 0) AS totalInventoryQuantity
      RETURN activeDisasters, totalDisasters,
             pendingRequests, totalRequests,
             availableVolunteers, totalVolunteers,
             totalInventoryQuantity, totalInventoryItems
    `;

    // 2. Recent Requests
    const recentRequestsQuery = `
      MATCH (r:Request)
      OPTIONAL MATCH (r)-[:RELATED_TO]->(d:Disaster)
      OPTIONAL MATCH (r)-[:AT_LOCATION]->(l:Location)
      OPTIONAL MATCH (u:User)-[:SUBMITTED]->(r)
      RETURN coalesce(r.requestId, id(r)) AS RequestID,
             coalesce(r.requestType, 'General Relief') AS Type,
             coalesce(r.priority, 'Medium') AS Priority,
             coalesce(r.status, 'Pending') AS Status,
             coalesce(r.description, '') AS Description,
             coalesce(toString(r.requestTime), 'N/A') AS RequestDate,
             coalesce(d.disasterName, d.disasterType, 'None') AS DisasterName,
             coalesce(d.disasterId, '') AS DisasterID,
             coalesce(l.area, l.city, l.address, 'Unknown') AS LocationName,
             coalesce(u.fullName, 'Anonymous') AS RequesterName
      ORDER BY RequestID DESC
      LIMIT 6
    `;

    // 3. Disaster types breakdown
    const disasterTypesQuery = `
      MATCH (d:Disaster)
      WITH coalesce(d.disasterType, 'Unspecified') AS type, count(d) AS count
      RETURN type, count
      ORDER BY count DESC
    `;

    // 4. Request statuses breakdown
    const requestStatusesQuery = `
      MATCH (r:Request)
      WITH coalesce(r.status, 'Unknown') AS status, count(r) AS count
      RETURN status, count
      ORDER BY count DESC
    `;

    // 5. Inventory by category
    const inventoryCategoriesQuery = `
      MATCH (res:Resource)-[s:STOCKED_AT]->(l:Location)
      WITH coalesce(res.category, 'General') AS category,
           coalesce(sum(coalesce(s.quantity, 0)), 0) AS totalQuantity,
           count(s) AS itemCount
      RETURN category, totalQuantity, itemCount
      ORDER BY totalQuantity DESC
    `;

    // 6. Complete 9 entity counts calculated from actual node labels & relationships:
    // ROLE: distinct User.role values
    // USER: User nodes count
    // LOCATION: Location nodes count
    // DISASTER: Disaster nodes count
    // EMERGENCY_REQUEST: Request nodes count
    // VOLUNTEER: Volunteer nodes count
    // ASSIGNMENT: ASSIGNED_TO relationships count
    // RESOURCE: Resource nodes count
    // INVENTORY: STOCKED_AT relationships count
    const entityCountsQuery = `
      MATCH (u:User) WITH count(DISTINCT u.role) AS ROLE, count(u) AS USER
      MATCH (l:Location) WITH ROLE, USER, count(l) AS LOCATION
      MATCH (d:Disaster) WITH ROLE, USER, LOCATION, count(d) AS DISASTER
      MATCH (r:Request) WITH ROLE, USER, LOCATION, DISASTER, count(r) AS EMERGENCY_REQUEST
      MATCH (v:Volunteer) WITH ROLE, USER, LOCATION, DISASTER, EMERGENCY_REQUEST, count(v) AS VOLUNTEER
      MATCH ()-[a:ASSIGNED_TO]->() WITH ROLE, USER, LOCATION, DISASTER, EMERGENCY_REQUEST, VOLUNTEER, count(a) AS ASSIGNMENT
      MATCH (res:Resource) WITH ROLE, USER, LOCATION, DISASTER, EMERGENCY_REQUEST, VOLUNTEER, ASSIGNMENT, count(res) AS RESOURCE
      MATCH ()-[s:STOCKED_AT]->() WITH ROLE, USER, LOCATION, DISASTER, EMERGENCY_REQUEST, VOLUNTEER, ASSIGNMENT, RESOURCE, count(s) AS INVENTORY
      RETURN {
        ROLE: ROLE,
        USER: USER,
        LOCATION: LOCATION,
        DISASTER: DISASTER,
        EMERGENCY_REQUEST: EMERGENCY_REQUEST,
        VOLUNTEER: VOLUNTEER,
        ASSIGNMENT: ASSIGNMENT,
        RESOURCE: RESOURCE,
        INVENTORY: INVENTORY
      } AS counts
    `;

    const [
      kpiResults,
      recentRequests,
      disasterTypes,
      requestStatuses,
      inventoryCategories,
      entityCountsRes
    ] = await Promise.all([
      runQuery(kpiQuery),
      runQuery(recentRequestsQuery),
      runQuery(disasterTypesQuery),
      runQuery(requestStatusesQuery),
      runQuery(inventoryCategoriesQuery),
      runQuery(entityCountsQuery).catch((err) => {
        console.warn('Entity counts query error:', err.message);
        return [{ counts: {} }];
      })
    ]);

    const stats = kpiResults[0] || {
      activeDisasters: 0,
      totalDisasters: 0,
      pendingRequests: 0,
      totalRequests: 0,
      availableVolunteers: 0,
      totalVolunteers: 0,
      totalInventoryQuantity: 0,
      totalInventoryItems: 0
    };

    res.json({
      success: true,
      data: {
        stats,
        recentRequests,
        charts: {
          disasterTypes,
          requestStatuses,
          inventoryCategories
        },
        entityCounts: entityCountsRes[0]?.counts || {}
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch dashboard metrics'
    });
  }
});

module.exports = router;
