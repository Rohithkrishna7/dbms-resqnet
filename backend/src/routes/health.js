const express = require('express');
const router = express.Router();
const { verifyConnectivity, runQuery } = require('../config/neo4j');

router.get('/', async (req, res) => {
  try {
    const conn = await verifyConnectivity();
    if (!conn.connected) {
      return res.status(200).json({
        status: 'warning',
        database: 'disconnected',
        message: conn.message || 'Database connection could not be established.',
        details: conn.error || null,
        timestamp: new Date().toISOString()
      });
    }

    // Quick node count check to verify schema and data
    let nodeCount = 0;
    try {
      const countRes = await runQuery('MATCH (n) RETURN count(n) AS totalNodes');
      nodeCount = countRes[0]?.totalNodes || 0;
    } catch (e) {
      console.warn('Could not query node count:', e.message);
    }

    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      serverTime: conn.serverTime,
      databaseAddress: conn.address,
      databaseAgent: conn.version,
      totalNodes: nodeCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      database: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
