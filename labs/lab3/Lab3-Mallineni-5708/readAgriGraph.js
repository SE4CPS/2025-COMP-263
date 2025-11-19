require('dotenv').config();
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

(async () => {
  const dbName = process.env.NEO4J_DB || 'neo4j';
  console.log(`Querying DB: ${process.env.NEO4J_URI} [${dbName}]`);

  const session = driver.session({ database: dbName });
  try {
    const cypher = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f.id AS farmId, f.name AS farmName,
             d.id AS deviceId, d.type AS deviceType,
             r.rid AS readingId, r.metric AS metric, r.value AS value, r.unit AS unit, r.ts AS timestamp
      ORDER BY farmName, deviceId, timestamp
    `;
    const res = await session.run(cypher);
    const rows = res.records.map(rec => ({
      farmId: rec.get('farmId'),
      farmName: rec.get('farmName'),
      deviceId: rec.get('deviceId'),
      deviceType: rec.get('deviceType'),
      readingId: rec.get('readingId'),
      metric: rec.get('metric'),
      value: rec.get('value'),
      unit: rec.get('unit'),
      timestamp: rec.get('timestamp')?.toString()
    }));

    if (rows.length === 0) {
      console.log('No rows found.');
      return;
    }
    console.log('\n=== Farm → Device → Reading ===');
    console.table(rows);
    console.log(`Rows: ${rows.length}`);
  } catch (err) {
    console.error('Neo4j read error:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
})();