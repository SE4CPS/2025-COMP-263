// sampleNeo4jRead.js  (CommonJS)
const neo4j = require('neo4j-driver');
require('dotenv').config(); // <= works after you install dotenv

const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env;
if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
  console.error("Missing NEO4J_* in .env");
  process.exit(1);
}

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
  { disableLosslessIntegers: true }
);

function pick(obj, keys) { for (const k of keys) if (obj && obj[k] != null) return obj[k]; }

(async () => {
  const session = driver.session();
  try {
    const cypher = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f,d,r
      ORDER BY f.name, d.type, r.timestamp
    `;
    const res = await session.run(cypher);

    const rows = res.records.map(rec => {
      const f = rec.get('f').properties || {};
      const d = rec.get('d').properties || {};
      const r = rec.get('r').properties || {};
      return {
        Farm: pick(f, ['name','id','farmName']),
        DeviceType: pick(d, ['type','deviceType','model']),
        Metric: pick(r, ['metric','type']),
        Value: pick(r, ['ReadingValue','readingValue','value','val']),
        Unit: pick(r, ['unit','units']),
        Timestamp: (r.timestamp && r.timestamp.toString) ? r.timestamp.toString() : r.timestamp
      };
    });

    console.log("\n=== Agriculture Graph Readout ===");
    console.table(rows);
    console.log("Rows:", rows.length);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await session.close();
    await driver.close();
  }
})();