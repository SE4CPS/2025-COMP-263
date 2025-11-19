// labs/lab3/queryAgricultureGraph.js
const neo4j = require('neo4j-driver');

// Hardcoded Neo4j credentials
const driver = neo4j.driver(
  'neo4j+s://7bc0170a.databases.neo4j.io',
  neo4j.auth.basic('neo4j', '8QKjaQU-B9oBvXHWm_Oy0m2Yj8JffBMUE-Y9OkpqNcE')
);

async function queryAgricultureGraph() {
  const session = driver.session();
  
  try {
    console.log('Connecting to Neo4j...\n');
    
    // Run the Cypher query to get Farm-Device-Reading relationships
    const query = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading) 
      RETURN f, d, r
    `;
    
    const result = await session.run(query);
    
    console.log('='.repeat(80));
    console.log('AGRICULTURE GRAPH QUERY RESULTS');
    console.log('='.repeat(80));
    console.log(`Total records found: ${result.records.length}\n`);
    
    // Process and format each record
    result.records.forEach((record, index) => {
      const farm = record.get('f');
      const device = record.get('d');
      const reading = record.get('r');
      
      console.log(`Record ${index + 1}:`);
      console.log('-'.repeat(80));
      
      // Display Farm information
      console.log('  FARM:');
      console.log(`    Name: ${farm.properties.name || 'N/A'}`);
      console.log(`    Properties: ${JSON.stringify(farm.properties)}`);
      
      // Display Device information
      console.log('\n  DEVICE:');
      console.log(`    Type: ${device.properties.type || 'N/A'}`);
      console.log(`    ID: ${device.properties.deviceId || device.properties.id || 'N/A'}`);
      console.log(`    Properties: ${JSON.stringify(device.properties)}`);
      
      // Display Reading information
      console.log('\n  READING:');
      console.log(`    Value: ${reading.properties.value || 'N/A'}`);
      console.log(`    Timestamp: ${reading.properties.timestamp || 'N/A'}`);
      console.log(`    Properties: ${JSON.stringify(reading.properties)}`);
      
      console.log('='.repeat(80));
      console.log();
    });
    
    if (result.records.length === 0) {
      console.log('No records found. Make sure your Neo4j database contains:');
      console.log('  - Farm nodes');
      console.log('  - Device nodes');
      console.log('  - Reading nodes');
      console.log('  - Relationships: (Farm)-[:HAS_DEVICE]->(Device)-[:GENERATES]->(Reading)');
    }
    
  } catch (err) {
    console.error('Error querying Neo4j:', err.message);
    console.error('Full error:', err);
  } finally {
    await session.close();
    await driver.close();
    console.log('\nConnection closed.');
  }
}

// Run the query
queryAgricultureGraph();