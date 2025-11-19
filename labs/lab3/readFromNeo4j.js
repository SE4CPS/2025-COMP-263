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
    // --- 1) Show database info ---
    const dbInfo = await session.run('CALL db.info() YIELD name RETURN name');
    const dbName = dbInfo.records[0].get('name');
    console.log(`Connected to database: ${dbName}`);

    // --- 2) Read some nodes (labels + properties) ---
    const nodes = await session.run(`
      MATCH (n) 
      RETURN labels(n) AS labels, properties(n) AS props 
      LIMIT 5
    `);

    console.log("=== Sample Nodes ===");
    nodes.records.forEach(record => {
      console.log("Labels:", record.get('labels'));
      console.log("Properties:", record.get('props'));
    });

    // --- 3) Read some relationships (node links) ---
    const rels = await session.run(`
      MATCH (a)-[r]->(b) 
      RETURN a, type(r) AS relType, b 
      LIMIT 5
    `);

    console.log("=== Sample Relationships ===");
    rels.records.forEach(record => {
      const a = record.get('a').properties;
      const b = record.get('b').properties;
      const rel = record.get('relType');
      console.log(`${a.name || JSON.stringify(a)} -[${rel}]-> ${b.name || JSON.stringify(b)}`);
    });

  } catch (err) {
    console.error('Neo4j connection error:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();