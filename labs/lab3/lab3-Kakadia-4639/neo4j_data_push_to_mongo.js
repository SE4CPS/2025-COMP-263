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
      RETURN f, d, r
    `);

    console.log('=== Data Fetched ===');
    const data = [];
    result.records.forEach((rec, idx) => {
      const f = rec.get('f') || {};
      const d = rec.get('d') || {};
      const r = rec.get('r') || {};
      const {ts, timestamp, ...rest} = r.properties;
      const obj = {
        id: idx+1,
        farm: {
          ...f.properties,
        },
        device: {
          ...d.properties,
        },
        reading: {
          ...rest,
          timestamp: r.properties.ts?.toStandardDate()?.toISOString() || r.properties.timestamp?.toStandardDate()?.toISOString() || "N/A",
        },
        metadata: {
          author: 'Ravi Pareshbhai Kakadia',
          sourceDB: 'Neo4j',
          ingestedAt: new Date().toISOString()
        }
      }
      data.push(obj);
    });
    console.log(data);

    const response = await fetch("http://localhost:3000/farmData", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    .then(res => res.json())
    .then(data => {
      console.log("✅ Data synced to MongoDB:", data);
    })
    .catch(err => {
      console.error("❌ Sync error:", err);
    });

  } catch (err) {
    console.error('Neo4j read error:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();