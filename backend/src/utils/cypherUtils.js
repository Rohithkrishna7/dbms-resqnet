const neo4j = require('neo4j-driver');

/**
 * Recursively converts Neo4j data structures (Integers, Records, Nodes, Relationships)
 * into standard JavaScript objects, arrays, and primitive numbers.
 */
function toNative(value) {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle Neo4j Integer
  if (neo4j.isInt(value)) {
    return value.inSafeRange() ? value.toNumber() : value.toString();
  }

  // Handle Neo4j Date, DateTime, LocalDateTime, Time, LocalTime
  if (
    neo4j.isDate(value) ||
    neo4j.isDateTime(value) ||
    neo4j.isLocalDateTime(value) ||
    neo4j.isTime(value) ||
    neo4j.isLocalTime(value)
  ) {
    return value.toString();
  }

  // Handle Arrays
  if (Array.isArray(value)) {
    return value.map(toNative);
  }

  // Handle Neo4j Node
  if (value && typeof value === 'object' && 'labels' in value && 'properties' in value) {
    const cleanProps = toNative(value.properties);
    return {
      _id: value.identity ? toNative(value.identity) : value.elementId,
      _labels: value.labels,
      ...cleanProps
    };
  }

  // Handle Neo4j Relationship
  if (value && typeof value === 'object' && 'type' in value && 'properties' in value) {
    const cleanProps = toNative(value.properties);
    return {
      _id: value.identity ? toNative(value.identity) : value.elementId,
      _type: value.type,
      _start: value.start ? toNative(value.start) : value.startNodeElementId,
      _end: value.end ? toNative(value.end) : value.endNodeElementId,
      ...cleanProps
    };
  }

  // Handle Record
  if (value && typeof value === 'object' && typeof value.toObject === 'function') {
    return toNative(value.toObject());
  }

  // Handle Plain Object
  if (typeof value === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(value)) {
      res[k] = toNative(v);
    }
    return res;
  }

  return value;
}

/**
 * Extracts normalized records from Neo4j query result
 */
function formatRecords(result) {
  if (!result || !result.records) return [];
  return result.records.map(record => {
    const obj = {};
    record.keys.forEach(key => {
      obj[key] = toNative(record.get(key));
    });
    return obj;
  });
}

module.exports = {
  toNative,
  formatRecords
};
