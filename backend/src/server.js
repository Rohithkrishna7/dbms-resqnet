const express = require('express');
const cors = require('cors');
require('dotenv').config();

const healthRouter = require('./routes/health');
const dashboardRouter = require('./routes/dashboard');
const disastersRouter = require('./routes/disasters');
const requestsRouter = require('./routes/requests');
const volunteersRouter = require('./routes/volunteers');
const assignmentsRouter = require('./routes/assignments');
const inventoryRouter = require('./routes/inventory');
const graphRouter = require('./routes/graph');
const metaRouter = require('./routes/meta');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/disasters', disastersRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/volunteers', volunteersRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/graph', graphRouter);
app.use('/api/meta', metaRouter);

// Base route
app.get('/', (req, res) => {
  res.json({
    app: 'ResQNet API',
    description: 'Disaster Response and Resource Management System using Neo4j AuraDB',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      dashboard: '/api/dashboard/summary',
      disasters: '/api/disasters',
      requests: '/api/requests',
      volunteers: '/api/volunteers',
      assignments: '/api/assignments',
      inventory: '/api/inventory',
      graph: '/api/graph',
      metadata: '/api/meta'
    }
  });
});

// 404 Route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl} - Route not found`
  });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  ResQNet Server running on http://localhost:${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);
});

module.exports = app;
