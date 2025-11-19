// labs/lab3/sampleNeo4jConnection.js
require('dotenv').config();
const neo4j = require('neo4j-driver');

// Create driver
const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function main() {
    const session = driver.session();
    try {

        const query = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f.name AS farmName, d.type AS deviceType, r.value AS readingValue
      LIMIT 25
    `;

        const result = await session.run(query);

        console.log("Query executed successfully!");
        console.log("=== Agriculture Graph Data ===");

        if (result.records.length === 0) {
            console.log("No results found! You might need to insert some sample data first.");
        } else {
            result.records.forEach((record, i) => {
                const farm = record.get("farmName");
                const device = record.get("deviceType");
                const reading = record.get("readingValue");
                console.log(`${i + 1}. Farm: ${farm} | Device: ${device} | Reading: ${reading}`);
            });
        }

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await session.close();
        await driver.close();
    }
}

main();


/*
// labs/lab3/agriGraph.js
require('dotenv').config();
const neo4j = require('neo4j-driver');

// Connect to Neo4j using environment variables
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function main() {
  const session = driver.session();
  try {
    console.log("🌾 Connecting to Neo4j Aura...");

    // Run the agriculture-specific query
    const query = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f.name AS farmName, d.type AS deviceType, r.value AS readingValue
      LIMIT 25
    `;

    const result = await session.run(query);

    console.log("✅ Query executed successfully!");
    console.log("=== Agriculture Graph Data ===");

    if (result.records.length === 0) {
      console.log("⚠️ No results found! You might need to insert some sample data first.");
    } else {
      result.records.forEach((record, i) => {
        const farm = record.get("farmName");
        const device = record.get("deviceType");
        const reading = record.get("readingValue");
        console.log(`${i + 1}. Farm: ${farm} | Device: ${device} | Reading: ${reading}`);
      });
    }

  } catch (err) {
    console.error("🚨 Error:", err.message);
  } finally {
    await session.close();
    await driver.close();
    console.log("🔌 Connection closed.");
  }
}

main();*/
