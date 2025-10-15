require('dotenv').config();
const neo4j = require('neo4j-driver');
const MongoLakeSync = require('./mongoLakeSync');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function queryAgricultureGraph() {
  const session = driver.session();
  const mongoLake = new MongoLakeSync();
  
  try {
    console.log('Connecting to Neo4j and querying agriculture graph...\n');
    
    const cypherQuery = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading) 
      RETURN f, d, r
    `;
    
    const result = await session.run(cypherQuery);
    
    console.log('Agriculture Graph Data Results:');
    console.log('=====================================\n');
    
    if (result.records.length === 0) {
      console.log('No data found. Make sure your Neo4j database contains:');
      console.log('- Farm nodes');
      console.log('- Device nodes connected to Farms via HAS_DEVICE relationship');
      console.log('- Reading nodes connected to Devices via GENERATES relationship\n');
      return [];
    } else {
      // Transform Neo4j data for MongoDB lake
      const neo4jData = result.records.map((record, index) => {
        const farm = record.get('f');
        const device = record.get('d');
        const reading = record.get('r');
        
        console.log(`Record ${index + 1}:`);
        console.log(`  Farm Name: ${farm.properties.name || farm.properties.farmName || 'Unknown'}`);
        console.log(`  Device Type: ${device.properties.type || device.properties.deviceType || 'Unknown'}`);
        console.log(`  Reading Value: ${reading.properties.value || reading.properties.readingValue || 'Unknown'}`);
        
        if (reading.properties.timestamp) {
          console.log(`  Timestamp: ${reading.properties.timestamp}`);
        }
        if (reading.properties.unit) {
          console.log(`  Unit: ${reading.properties.unit}`);
        }
        console.log('');

        // Transform to MongoDB lake format
        return {
          id: index + 1,
          sensorId: `NEO4J-${device.properties.id || device.identity.low || index}`,
          reading: parseFloat(reading.properties.value || reading.properties.readingValue || 0),
          timestamp: reading.properties.timestamp || new Date().toISOString(),
          notes: `Neo4j data from ${farm.properties.name || farm.properties.farmName || 'Unknown Farm'}`,
          location: farm.properties.location || farm.properties.name || 'Unknown Location',
          deviceType: device.properties.type || device.properties.deviceType || 'Unknown Device',
          unit: reading.properties.unit || 'unknown',
          farmId: farm.properties.id || farm.identity.low,
          deviceId: device.properties.id || device.identity.low,
          readingId: reading.properties.id || reading.identity.low
        };
      });
      
      console.log(`Total records found: ${result.records.length}`);
      
      // Push Neo4j data to MongoDB lake
      if (neo4jData.length > 0) {
        await mongoLake.pushNeo4jData(neo4jData);
      }
      
      return neo4jData;
    }
    
  } catch (err) {
    console.error('Error querying agriculture graph:', err.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Ensure your .env file contains correct Neo4j credentials');
    console.log('2. Verify your Neo4j database has the required graph structure');
    console.log('3. Check that Farm, Device, and Reading nodes exist with proper relationships');
    return [];
  } finally {
    await session.close();
    await driver.close();
  }
}

// Export the function for use in other modules
module.exports = { queryAgricultureGraph };

// Run directly if this file is executed
if (require.main === module) {
  queryAgricultureGraph();
}
