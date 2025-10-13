// labs/lab3/readAgriGraph.js
require('dotenv').config();
const neo4j = require('neo4j-driver');

// Read credentials from .env
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

function toNative(v) {
  if (neo4j.isInt(v)) return v.toNumber();
  return v;
}

async function main() {
  const session = driver.session();
  try {
    const cypher = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f, d, r
      LIMIT 100
    `;
    const res = await session.run(cypher);

    if (res.records.length === 0) {
      console.log("⚠️ No results found. Make sure you’ve added data to Neo4j.");
      return;
    }

    const rows = res.records.map(rec => {
      const f = rec.get('f').properties;
      const d = rec.get('d').properties;
      const r = rec.get('r').properties;
      return {
        Farm: f.name || "(no name)",
        Device: d.type || "(no type)",
        Reading: toNative(r.value || "(no value)"),
        Unit: r.unit || "",
        Time: r.timestamp || ""
      };
    });

    console.log("\n✅ Connected successfully! Agriculture graph data:\n");
    console.table(rows);
  } catch (err) {
    console.error("❌ Neo4j error:", err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();