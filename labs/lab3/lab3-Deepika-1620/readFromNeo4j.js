require('dotenv').config();
const neo4j = require('neo4j-driver');

function requireEnv(keys) {
  const missing = keys.filter(k => !process.env[k] || process.env[k].trim() === '');
  if (missing.length) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
}

requireEnv(['NEO4J_URI', 'NEO4J_USER', 'NEO4J_PASSWORD']);

(async function main() {
  const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
  );
  const session = driver.session();

  try {
    console.log('Running Cypher read...');
    const cypher = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN
        coalesce(f.name, 'N/A') AS farmName,
        coalesce(d.type, 'N/A') AS deviceType,
        r.value AS readingValue,
        toString(r.ts) AS readingTs
      ORDER BY farmName, deviceType
    `;
    const result = await session.run(cypher);

   console.log('=== Farm / Device / Reading ===');
result.records.forEach((rec, i) => {
  const farm = rec.get('farmName');
  const dev = rec.get('deviceType');
  const val = rec.get('readingValue') ?? 'N/A';
  const ts  = rec.get('readingTs') ?? 'N/A';
  console.log(`${i + 1}. | Farm: ${farm} | Device: ${dev} | Reading: ${val} @ ${ts}`);
});


  } catch (err) {
    console.error('Neo4j read error:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
})();