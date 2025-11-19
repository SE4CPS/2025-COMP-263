require('dotenv').config();
const neo4j = require('neo4j-driver');

// Create Neo4j driver using credentials from .env
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function main() {
  const session = driver.session();
  try {
    console.log("🔗 Connecting to Neo4j AuraDB...");

    // Run Cypher query to fetch Farm → Device → Reading relationships
    const result = await session.run(`
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f{.*} AS farm, d{.*} AS device, r{.*} AS reading
      LIMIT 10
    `);

    console.log("\n=== 🌾 Farm → Device → Reading Data ===");
    if (result.records.length === 0) {
      console.log("⚠️ No data found in your Neo4j database.");
    }

    // Format output for easy reading
    result.records.forEach(rec => {
      const f = rec.get('farm');
      const d = rec.get('device');
      const r = rec.get('reading');

      console.log(`Farm: ${f.name || f.id || "(unnamed)"} | Device: ${d.type || d.name || "(no type)"} | Reading: ${r.value || r.measure || "(no value)"}`);
    });

  } catch (err) {
    console.error("❌ Neo4j connection/query error:", err.message);
  } finally {
    await session.close();
    await driver.close();
    console.log("\n✅ Connection closed.");
  }
}

// Run script
main();