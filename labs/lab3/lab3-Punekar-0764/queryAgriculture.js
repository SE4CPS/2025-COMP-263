// labs/lab3/queryAgriculture.js
require('dotenv').config(); // expects .env in labs/lab3
const neo4j = require('neo4j-driver');

const URI  = process.env.NEO4J_URI || process.env.BOLT_URL; // allow either name
const USER = process.env.NEO4J_USER;
const PASS = process.env.NEO4J_PASSWORD;

if (!URI || !USER || !PASS) {
  throw new Error('Missing NEO4J_URI (or BOLT_URL), NEO4J_USER, NEO4J_PASSWORD in .env');
}

const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASS));

async function main() {
  const session = driver.session();
  try {
    const cypher = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN
        f.name  AS farm,
        d.type  AS device,
        coalesce(r.value, r.tempC, r.moisture, r.humidity) AS reading,
        r.unit  AS unit,
        r.ts    AS ts
      ORDER BY farm, device, ts
      LIMIT 100
    `;
    const res = await session.run(cypher);

    console.log('=== Agriculture Graph Results ===');
    if (res.records.length === 0) {
      console.log('No records found. Seed data in Neo4j, then re-run this script.');
      return;
    }

    // Build rows for pretty printing
    const rows = res.records.map(rec => ({
      Farm:    rec.get('farm')   ?? '(unknown)',
      Device:  rec.get('device') ?? '(unknown)',
      Reading: rec.get('reading'),
      Unit:    rec.get('unit')   ?? '',
      Time:    rec.get('ts')?.toString?.() ?? ''
    }));

    // Nice table + simple lines
    console.table(rows);
    rows.forEach(r => {
      console.log(`Farm: ${r.Farm} | Device: ${r.Device} | Reading: ${r.Reading}${r.Unit ? ' ' + r.Unit : ''} | ts: ${r.Time}`);
    });
  } catch (err) {
    console.error('Query failed:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();
