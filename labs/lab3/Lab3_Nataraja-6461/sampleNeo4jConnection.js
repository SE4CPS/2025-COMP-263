// sampleNeo4jConnection.js
const neo4j = require('neo4j-driver');

const uri = "neo4j://127.0.0.1:7687";  // or your Aura connection string
const user = "neo4j";
const password = "A1234567";

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

async function runQuery() {
  const session = driver.session();

  try {
    const query = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f.name AS farmName, d.type AS deviceType, r.value AS readingValue
    `;

    const result = await session.run(query);

    console.log("=== Agriculture Graph Data ===");
    result.records.forEach(record => {
      console.log(`Farm: ${record.get('farmName')} | Device: ${record.get('deviceType')} | Reading: ${record.get('readingValue')}`);
    });

  } catch (error) {
    console.error("Error running query:", error);
  } finally {
    await session.close();
  }
  await driver.close();
}

runQuery();