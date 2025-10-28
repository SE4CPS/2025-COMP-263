// labs/lab3/sampleNeo4jConnection.js
require('dotenv').config();
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function main() {
  const session = driver.session();
  try {
    const res = await session.run('RETURN "Connected to Neo4j Aura!" AS status');
    console.log(res.records[0].get('status'));

    // Fetch and print the database name
    const dbInfo = await session.run('CALL db.info() YIELD name RETURN name');
    const dbName = dbInfo.records[0].get('name');
    console.log(`Connected to database: ${dbName}`);

    // Fetch and print a sample of nodes
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

    // Fetch and print a sample of relationships
    const relationships = await session.run(`
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f, d, r
      LIMIT 5
    `);
    
    console.log("=== Sample Relationships ===");   
        relationships.records.forEach(record => {
        const f = record.get('f').properties ?? {};
        const d = record.get('d').properties ?? {};
        const r = record.get('r').properties ?? {};
        console.log(`  Farm Name: ${f.name || f.farmName || 'Unknown'}`);
        console.log(`  Device Type: ${d.type || d.deviceType || 'Unknown'}`);
        console.log(`  Reading Value: ${r.value || f.readingValue || 'Unknown'}`);
        
        if (r.timestamp) {
          console.log(`  Timestamp: ${r.timestamp}`);
        }
        if (r.unit) {
          console.log(`  Unit: ${r.unit}`);
        }
        console.log('');
    });
    console.log("\n✅ Connected successfully! Agriculture graph data:\n")

  } catch (err) {
    console.error('Neo4j connection error:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();