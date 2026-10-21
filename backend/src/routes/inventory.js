const express = require('express');
const router = express.Router();
const { runQuery } = require('../config/neo4j');

const DEFAULT_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD, 10) || 25;

// GET /api/inventory - List inventory with resource, location, and low stock evaluation
router.get('/', async (req, res) => {
  try {
    const { category, lowStockOnly, search } = req.query;
    const threshold = req.query.threshold ? parseInt(req.query.threshold, 10) : DEFAULT_THRESHOLD;

    let cypher = `
      MATCH (res:Resource)-[s:STOCKED_AT]->(l:Location)
      WHERE 1=1
    `;
    const params = { threshold };

    if (category) {
      cypher += ` AND toLower(coalesce(res.category, '')) = toLower($category)`;
      params.category = category;
    }

    if (lowStockOnly === 'true') {
      cypher += ` AND coalesce(s.quantity, 0) <= $threshold`;
    }

    if (search) {
      cypher += ` AND (
        toLower(coalesce(res.resourceName, '')) CONTAINS toLower($search) OR
        toLower(coalesce(res.category, '')) CONTAINS toLower($search) OR
        toLower(coalesce(l.area, '')) CONTAINS toLower($search) OR
        toLower(coalesce(l.city, '')) CONTAINS toLower($search)
      )`;
      params.search = search;
    }

    cypher += `
      RETURN (toString(res.resourceId) + '-' + toString(l.locationId)) AS InventoryID,
             coalesce(s.quantity, 0) AS Quantity,
             coalesce(res.resourceId, '') AS ResourceID,
             coalesce(res.resourceName, 'Unknown Resource') AS ResourceName,
             coalesce(res.category, 'General') AS Category,
             coalesce(res.unit, 'Units') AS Unit,
             coalesce(l.locationId, '') AS LocationID,
             coalesce(l.area, l.city, l.address, 'Main Warehouse') AS LocationName,
             coalesce(l.city, '') AS LocationCity,
             (coalesce(s.quantity, 0) <= $threshold) AS isLowStock,
             $threshold AS threshold
      ORDER BY Quantity ASC, ResourceName ASC
    `;

    const records = await runQuery(cypher, params);
    res.json({
      success: true,
      count: records.length,
      threshold,
      data: records
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/inventory/:id/quantity - Update inventory quantity on STOCKED_AT relationship
router.patch('/:id/quantity', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity === null || isNaN(Number(quantity))) {
      return res.status(400).json({
        success: false,
        error: 'Valid numeric quantity is required.'
      });
    }

    const newQuantity = Number(quantity);
    if (newQuantity < 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity cannot be negative.'
      });
    }

    const cypher = `
      MATCH (res:Resource)-[s:STOCKED_AT]->(l:Location)
      WHERE (toString(res.resourceId) + '-' + toString(l.locationId)) = $id
         OR toString(res.resourceId) = $id
         OR toString(id(s)) = $id
         OR elementId(s) = $id
      SET s.quantity = $quantity
      RETURN (toString(res.resourceId) + '-' + toString(l.locationId)) AS InventoryID,
             s.quantity AS Quantity
    `;

    const result = await runQuery(cypher, { id: String(id), quantity: newQuantity });
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Inventory stock record not found.'
      });
    }

    res.json({
      success: true,
      message: `Inventory stock updated to ${newQuantity}`,
      data: result[0]
    });
  } catch (error) {
    console.error('Error updating inventory quantity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/inventory/categories - List unique categories
router.get('/categories', async (req, res) => {
  try {
    const cypher = `
      MATCH (res:Resource)
      RETURN DISTINCT coalesce(res.category, 'General') AS category
      ORDER BY category ASC
    `;
    const records = await runQuery(cypher);
    res.json({
      success: true,
      data: records.map(r => r.category)
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
