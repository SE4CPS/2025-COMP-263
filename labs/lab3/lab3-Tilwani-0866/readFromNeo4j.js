
require('dotenv').config();
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function main() {
  const session = driver.session();
  try {
    console.log('Running Cypher read...');
    const result = await session.run(`
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f{.*} AS farm, d{.*} AS device, r{.*, ts: toString(r.ts)} AS reading
    `);

    console.log('=== Farm / Device / Reading ===');
    result.records.forEach((rec, idx) => {
      const f = rec.get('farm') || {};
      const d = rec.get('device') || {};
      const r = rec.get('reading') || {};
      const line = `${idx + 1}. | Farm: ${f.name ?? 'N/A'} | Device: ${d.type ?? 'N/A'} | Reading: ${r.value ?? 'N/A'} @ ${r.ts ?? 'N/A'}`;
      console.log(line);
    });
  } catch (err) {
    console.error('Neo4j read error:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();