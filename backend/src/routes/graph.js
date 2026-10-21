const express = require('express');
const router = express.Router();
const neo4j = require('neo4j-driver');
const { runQuery } = require('../config/neo4j');
const { toNative } = require('../utils/cypherUtils');

// Allowed node labels in live Neo4j AuraDB schema
const ALLOWED_LABELS = [
  'Location',
  'User',
  'Disaster',
  'Request',
  'Volunteer',
  'Resource'
];

// Label map for case-insensitive or legacy alias lookup
const LABEL_ALIAS_MAP = {
  LOCATION: 'Location',
  USER: 'User',
  DISASTER: 'Disaster',
  REQUEST: 'Request',
  EMERGENCY_REQUEST: 'Request',
  VOLUNTEER: 'Volunteer',
  RESOURCE: 'Resource'
};

// Color mapping for Cytoscape visualization
const LABEL_COLORS = {
  Location: '#10b981',  // Emerald Green
  User: '#3b82f6',      // Blue
  Disaster: '#ef4444',  // Rose Red
  Request: '#f97316',   // Orange
  Volunteer: '#06b6d4', // Cyan
  Resource: '#ec4899',  // Pink
  LOCATION: '#10b981',
  USER: '#3b82f6',
  DISASTER: '#ef4444',
  REQUEST: '#f97316',
  EMERGENCY_REQUEST: '#f97316',
  VOLUNTEER: '#06b6d4',
  RESOURCE: '#ec4899'
};

// Helper to format a node into a Cytoscape element
function formatNodeData(node) {
  if (!node) return null;
  const id = node.elementId || String(node.identity);
  const labels = node.labels || [];
  const primaryLabel = labels.find(l => ALLOWED_LABELS.includes(l)) || labels[0] || 'Node';

  const props = toNative({ ...node.properties });
  delete props.password;
  delete props.Password;
  delete props.hash;
  delete props.token;

  const displayName =
    props.fullName ||
    props.disasterName ||
    props.resourceName ||
    props.requestType ||
    props.area ||
    props.city ||
    props.address ||
    (props.volunteerId ? `Volunteer #${props.volunteerId}` : null) ||
    props.name ||
    `${primaryLabel} #${String(id).slice(-4)}`;

  return {
    data: {
      id,
      label: primaryLabel,
      name: String(displayName),
      color: LABEL_COLORS[primaryLabel] || '#94a3b8',
      properties: props
    }
  };
}

// Helper to format a relationship into a Cytoscape element
function formatEdgeData(rel) {
  if (!rel) return null;
  const startId = rel.startNodeElementId || String(rel.start);
  const endId = rel.endNodeElementId || String(rel.end);
  const edgeId = rel.elementId || String(rel.identity) || `e-${startId}-${endId}`;

  return {
    data: {
      id: edgeId,
      source: startId,
      target: endId,
      label: rel.type,
      properties: toNative(rel.properties || {})
    }
  };
}

// GET /api/graph/shortest-path - Advanced Query 5: Shortest path between relevant entities
router.get('/shortest-path', async (req, res) => {
  try {
    const { startId, endId, startLabel, endLabel, maxDepth } = req.query;

    if (!startId || !endId) {
      return res.status(400).json({
        success: false,
        error: 'Both "startId" and "endId" are required query parameters.'
      });
    }

    // Validate optional label filters
    const validateLabel = (lbl) => {
      if (!lbl) return null;
      const clean = lbl.trim().toUpperCase();
      const resolved = LABEL_ALIAS_MAP[clean] || ALLOWED_LABELS.find(l => l.toUpperCase() === clean);
      return resolved || null;
    };

    const validStartLabel = startLabel ? validateLabel(startLabel) : null;
    if (startLabel && !validStartLabel) {
      return res.status(400).json({
        success: false,
        error: `Invalid startLabel "${startLabel}". Allowed labels: ${ALLOWED_LABELS.join(', ')}`
      });
    }

    const validEndLabel = endLabel ? validateLabel(endLabel) : null;
    if (endLabel && !validEndLabel) {
      return res.status(400).json({
        success: false,
        error: `Invalid endLabel "${endLabel}". Allowed labels: ${ALLOWED_LABELS.join(', ')}`
      });
    }

    let safeDepth = 6;
    if (maxDepth !== undefined && maxDepth !== null && String(maxDepth).trim() !== '') {
      const parsed = parseInt(maxDepth, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 10) {
        return res.status(400).json({
          success: false,
          error: 'Invalid "maxDepth" parameter. Must be an integer between 1 and 10.'
        });
      }
      safeDepth = parsed;
    }

    const cleanStartId = String(startId).trim();
    const cleanEndId = String(endId).trim();

    // 1. Verify existence of start and target nodes
    const findNodesCypher = `
      MATCH (start)
      WHERE (start.locationId = toInteger($cleanStartId) OR toString(start.locationId) = $cleanStartId
          OR start.userId = toInteger($cleanStartId) OR toString(start.userId) = $cleanStartId
          OR start.disasterId = toInteger($cleanStartId) OR toString(start.disasterId) = $cleanStartId
          OR start.requestId = toInteger($cleanStartId) OR toString(start.requestId) = $cleanStartId
          OR start.volunteerId = toInteger($cleanStartId) OR toString(start.volunteerId) = $cleanStartId
          OR start.resourceId = toInteger($cleanStartId) OR toString(start.resourceId) = $cleanStartId
          OR elementId(start) = $cleanStartId OR toString(id(start)) = $cleanStartId)
        AND ($validStartLabel IS NULL OR $validStartLabel IN labels(start))
      MATCH (target)
      WHERE (target.locationId = toInteger($cleanEndId) OR toString(target.locationId) = $cleanEndId
          OR target.userId = toInteger($cleanEndId) OR toString(target.userId) = $cleanEndId
          OR target.disasterId = toInteger($cleanEndId) OR toString(target.disasterId) = $cleanEndId
          OR target.requestId = toInteger($cleanEndId) OR toString(target.requestId) = $cleanEndId
          OR target.volunteerId = toInteger($cleanEndId) OR toString(target.volunteerId) = $cleanEndId
          OR target.resourceId = toInteger($cleanEndId) OR toString(target.resourceId) = $cleanEndId
          OR elementId(target) = $cleanEndId OR toString(id(target)) = $cleanEndId)
        AND ($validEndLabel IS NULL OR $validEndLabel IN labels(target))
      RETURN start, target LIMIT 1
    `;

    const nodesCheck = await runQuery(findNodesCypher, {
      cleanStartId,
      cleanEndId,
      validStartLabel: validStartLabel || null,
      validEndLabel: validEndLabel || null
    }, { raw: true });

    if (!nodesCheck || nodesCheck.records.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Could not find matching start entity ("${cleanStartId}") or target entity ("${cleanEndId}").`
      });
    }

    const startNode = nodesCheck.records[0].get('start');
    const targetNode = nodesCheck.records[0].get('target');

    // 2. Execute shortest path with schema relationships
    const pathCypher = `
      MATCH (start)
      WHERE (start.locationId = toInteger($cleanStartId) OR toString(start.locationId) = $cleanStartId
          OR start.userId = toInteger($cleanStartId) OR toString(start.userId) = $cleanStartId
          OR start.disasterId = toInteger($cleanStartId) OR toString(start.disasterId) = $cleanStartId
          OR start.requestId = toInteger($cleanStartId) OR toString(start.requestId) = $cleanStartId
          OR start.volunteerId = toInteger($cleanStartId) OR toString(start.volunteerId) = $cleanStartId
          OR start.resourceId = toInteger($cleanStartId) OR toString(start.resourceId) = $cleanStartId
          OR elementId(start) = $cleanStartId OR toString(id(start)) = $cleanStartId)
        AND ($validStartLabel IS NULL OR $validStartLabel IN labels(start))
      MATCH (target)
      WHERE (target.locationId = toInteger($cleanEndId) OR toString(target.locationId) = $cleanEndId
          OR target.userId = toInteger($cleanEndId) OR toString(target.userId) = $cleanEndId
          OR target.disasterId = toInteger($cleanEndId) OR toString(target.disasterId) = $cleanEndId
          OR target.requestId = toInteger($cleanEndId) OR toString(target.requestId) = $cleanEndId
          OR target.volunteerId = toInteger($cleanEndId) OR toString(target.volunteerId) = $cleanEndId
          OR target.resourceId = toInteger($cleanEndId) OR toString(target.resourceId) = $cleanEndId
          OR elementId(target) = $cleanEndId OR toString(id(target)) = $cleanEndId)
        AND ($validEndLabel IS NULL OR $validEndLabel IN labels(target))
      WITH start, target LIMIT 1
      MATCH p = shortestPath((start)-[:LOCATED_AT|SUBMITTED|RELATED_TO|AT_LOCATION|HAS_VOLUNTEER_PROFILE|ASSIGNED_TO|STOCKED_AT*..${safeDepth}]-(target))
      RETURN p,
             length(p) AS pathLength,
             nodes(p) AS pathNodes,
             relationships(p) AS pathRelationships
    `;

    const pathResult = await runQuery(pathCypher, {
      cleanStartId,
      cleanEndId,
      validStartLabel: validStartLabel || null,
      validEndLabel: validEndLabel || null
    }, { raw: true });

    const formattedStart = formatNodeData(startNode);
    const formattedTarget = formatNodeData(targetNode);

    if (!pathResult || pathResult.records.length === 0) {
      return res.json({
        success: true,
        found: false,
        message: `No connecting path found between ${formattedStart?.data?.name || cleanStartId} and ${formattedTarget?.data?.name || cleanEndId} within ${safeDepth} hops.`,
        pathLength: 0,
        startNode: formattedStart?.data,
        targetNode: formattedTarget?.data,
        elements: [formattedStart, formattedTarget].filter(Boolean),
        summary: { nodes: 2, edges: 0 }
      });
    }

    const rec = pathResult.records[0];
    const pathLen = rec.get('pathLength').toNumber ? rec.get('pathLength').toNumber() : Number(rec.get('pathLength'));
    const pathNodes = rec.get('pathNodes') || [];
    const pathRels = rec.get('pathRelationships') || [];

    const nodeElements = pathNodes.map(formatNodeData).filter(Boolean);
    const edgeElements = pathRels.map(formatEdgeData).filter(Boolean);

    res.json({
      success: true,
      found: true,
      query: 'Shortest path between relevant entities',
      pathLength: pathLen,
      maxDepth: safeDepth,
      startNode: formattedStart?.data,
      targetNode: formattedTarget?.data,
      summary: {
        nodes: nodeElements.length,
        edges: edgeElements.length
      },
      elements: [...nodeElements, ...edgeElements]
    });
  } catch (error) {
    console.error('Error finding shortest path:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/graph - Graph topology for Cytoscape.js
router.get('/', async (req, res) => {
  try {
    const { types, limit = 200 } = req.query;
    const maxLimit = Math.min(parseInt(limit, 10) || 200, 500);

    let activeLabels = ALLOWED_LABELS;
    if (types) {
      const requested = types.split(',').map(t => {
        const clean = t.trim().toUpperCase();
        return LABEL_ALIAS_MAP[clean] || (ALLOWED_LABELS.find(l => l.toUpperCase() === clean) || t.trim());
      });
      activeLabels = ALLOWED_LABELS.filter(l => requested.includes(l));
      if (activeLabels.length === 0) activeLabels = ALLOWED_LABELS;
    }

    // Parameterized Cypher query fetching matching nodes and relationships between them
    const cypher = `
      MATCH (n)
      WHERE any(lbl IN labels(n) WHERE lbl IN $activeLabels)
      WITH n LIMIT $maxLimit
      OPTIONAL MATCH (n)-[r]->(m)
      WHERE any(lbl IN labels(m) WHERE lbl IN $activeLabels)
      RETURN collect(DISTINCT n) AS nodes,
             collect(DISTINCT m) AS targetNodes,
             collect(DISTINCT r) AS relationships
    `;

    const records = await runQuery(cypher, { activeLabels, maxLimit: neo4j.int(maxLimit) }, { raw: true });
    if (!records || records.records.length === 0) {
      return res.json({ success: true, allowedLabels: ALLOWED_LABELS, labelColors: LABEL_COLORS, elements: [], summary: { nodes: 0, edges: 0 } });
    }

    const rec = records.records[0];
    const rawNodes = rec.get('nodes') || [];
    const rawTargetNodes = rec.get('targetNodes') || [];
    const rawRels = rec.get('relationships') || [];

    const nodeMap = new Map();
    const edgeMap = new Map();

    const addNode = (node) => {
      if (!node) return;
      const formatted = formatNodeData(node);
      if (formatted && !nodeMap.has(formatted.data.id)) {
        nodeMap.set(formatted.data.id, formatted);
      }
    };

    rawNodes.forEach(addNode);
    rawTargetNodes.forEach(addNode);

    rawRels.forEach(rel => {
      if (!rel) return;
      const startId = rel.startNodeElementId || String(rel.start);
      const endId = rel.endNodeElementId || String(rel.end);

      // Only add edge if both endpoints exist in our node set
      if (nodeMap.has(startId) && nodeMap.has(endId)) {
        const formattedEdge = formatEdgeData(rel);
        if (formattedEdge && !edgeMap.has(formattedEdge.data.id)) {
          edgeMap.set(formattedEdge.data.id, formattedEdge);
        }
      }
    });

    const elements = [...nodeMap.values(), ...edgeMap.values()];

    res.json({
      success: true,
      allowedLabels: ALLOWED_LABELS,
      labelColors: LABEL_COLORS,
      summary: {
        nodes: nodeMap.size,
        edges: edgeMap.size
      },
      elements
    });
  } catch (error) {
    console.error('Error fetching graph data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
