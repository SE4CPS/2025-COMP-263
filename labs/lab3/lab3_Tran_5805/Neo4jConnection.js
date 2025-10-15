require('dotenv').config();
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function main() {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f.name AS farmName, d.type AS deviceType, r.value AS readingValue
    `);

   const tableData = result.records.map(record => ({
      Farm: record.get('farmName'),
      Device: record.get('deviceType'),
      Reading: record.get('readingValue')
    }));

    console.table(tableData);
  } catch (err) {
    console.error("Neo4j query error:", err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();
