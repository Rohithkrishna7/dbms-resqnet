const neo4j = require('neo4j-driver');
require('dotenv').config();
const { formatRecords } = require('../utils/cypherUtils');

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USERNAME;
const password = process.env.NEO4J_PASSWORD;
const database = process.env.NEO4J_DATABASE || 'neo4j';

let driver = null;
let isConfigured = false;

if (uri && user && password) {
  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      disableLosslessIntegers: false,
      maxConnectionPoolSize: 50,
      connectionTimeout: 30000,
    });
    isConfigured = true;
    console.log(`[Neo4j] Driver initialized for URI: ${uri}`);
  } catch (err) {
    console.error('[Neo4j] Failed to initialize driver:', err.message);
  }
} else {
  console.warn('[Neo4j] Warning: NEO4J_URI, NEO4J_USERNAME, or NEO4J_PASSWORD not fully set in environment.');
}

/**
 * Verifies connectivity to the Neo4j instance
 */
async function verifyConnectivity() {
  if (!driver || !isConfigured) {
    return {
      connected: false,
      configured: false,
      message: 'Neo4j credentials not configured in environment (.env).'
    };
  }

  const session = driver.session({ database });
  try {
    const serverInfo = await driver.getServerInfo();
    const probe = await session.run('RETURN 1 AS ping, datetime() AS serverTime');
    const record = probe.records[0];
    return {
      connected: true,
      configured: true,
      address: serverInfo.address,
      version: serverInfo.agent,
      serverTime: record.get('serverTime').toString()
    };
  } catch (error) {
    return {
      connected: false,
      configured: true,
      error: error.message
    };
  } finally {
    await session.close();
  }
}

/**
 * Runs a Cypher query with automatic session management and formatted native JS results
 */
async function runQuery(cypher, params = {}, options = {}) {
  if (!driver || !isConfigured) {
    throw new Error('Neo4j driver is not configured. Please set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD in .env');
  }

  const sessionDatabase = options.database || database;
  const session = driver.session({ database: sessionDatabase });

  try {
    const result = await session.run(cypher, params);
    if (options.raw) {
      return result;
    }
    return formatRecords(result);
  } finally {
    await session.close();
  }
}

/**
 * Executes work within a managed transaction
 */
async function runTransaction(transactionWork, options = {}) {
  if (!driver || !isConfigured) {
    throw new Error('Neo4j driver is not configured. Please set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD in .env');
  }

  const sessionDatabase = options.database || database;
  const session = driver.session({ database: sessionDatabase });

  try {
    return await session.executeWrite(async tx => {
      return await transactionWork(tx);
    });
  } finally {
    await session.close();
  }
}

/**
 * Closes the Neo4j driver connection
 */
async function closeDriver() {
  if (driver) {
    await driver.close();
    console.log('[Neo4j] Driver connection closed.');
  }
}

process.on('SIGINT', async () => {
  await closeDriver();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDriver();
  process.exit(0);
});

module.exports = {
  driver,
  isConfigured,
  verifyConnectivity,
  runQuery,
  runTransaction,
  closeDriver
};
