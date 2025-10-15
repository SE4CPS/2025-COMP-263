require('dotenv').config();
const neo4j = require('neo4j-driver');
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);
const dbName = process.env.NEO4J_DB || 'neo4j';
const queries = [
  'MATCH (n:Farm) DETACH DELETE n',
  'MATCH (n:Device) DETACH DELETE n',
  'MATCH (n:Reading) DETACH DELETE n',
  'MERGE (f:Farm {id:"F-001"}) SET f.name="Sunrise Farm", f.location="Stockton"',
  'MERGE (f:Farm {id:"F-002"}) SET f.name="Riverbend Farm", f.location="Lodi"',
  'MERGE (d:Device {id:"D-001"}) SET d.type="SoilMoisture", d.model="SM-100"',
  'MERGE (d:Device {id:"D-002"}) SET d.type="Thermometer",  d.model="TH-200"',
  'MERGE (d:Device {id:"D-003"}) SET d.type="pHProbe",      d.model="PH-10"',
  'MERGE (r:Reading {rid:"R-1001"}) SET r.metric="moisture", r.value=31.2, r.unit="%",  r.ts=datetime("2025-10-14T16:00:00Z")',
  'MERGE (r:Reading {rid:"R-1002"}) SET r.metric="temp",     r.value=24.8, r.unit="C",  r.ts=datetime("2025-10-14T16:01:00Z")',
  'MERGE (r:Reading {rid:"R-1003"}) SET r.metric="ph",       r.value=6.5,  r.unit="pH", r.ts=datetime("2025-10-14T16:02:00Z")',
  'MERGE (r:Reading {rid:"R-1004"}) SET r.metric="moisture", r.value=28.7, r.unit="%",  r.ts=datetime("2025-10-14T16:05:00Z")',
  'MATCH (f:Farm {id:"F-001"}),(d:Device {id:"D-001"}) MERGE (f)-[:HAS_DEVICE]->(d)',
  'MATCH (f:Farm {id:"F-001"}),(d:Device {id:"D-002"}) MERGE (f)-[:HAS_DEVICE]->(d)',
  'MATCH (f:Farm {id:"F-002"}),(d:Device {id:"D-003"}) MERGE (f)-[:HAS_DEVICE]->(d)',
  'MATCH (d:Device {id:"D-001"}),(r:Reading {rid:"R-1001"}) MERGE (d)-[:GENERATES]->(r)',
  'MATCH (d:Device {id:"D-002"}),(r:Reading {rid:"R-1002"}) MERGE (d)-[:GENERATES]->(r)',
  'MATCH (d:Device {id:"D-003"}),(r:Reading {rid:"R-1003"}) MERGE (d)-[:GENERATES]->(r)',
  'MATCH (d:Device {id:"D-001"}),(r:Reading {rid:"R-1004"}) MERGE (d)-[:GENERATES]->(r)'
];
(async () => {
  const s = driver.session({ database: dbName });
  try {
    for (const q of queries) await s.run(q);
    const check = await s.run('MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading) RETURN count(*) AS c');
    const c = check.records[0].get('c').toInt?.() ?? check.records[0].get('c');
    console.log(`Seed complete. Triples in graph: ${c}`);
  } catch (e) { console.error('Seed error:', e.message); }
  finally { await s.close(); await driver.close(); }
})();