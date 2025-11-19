// pushNeo4jViaAPI.js - Push Neo4j data to MongoDB Data Lake via Go API
const neo4j = require('neo4j-driver');
const fetch = require('node-fetch');

// Neo4j Configuration
const NEO4J_URI = 'neo4j+s://7bc0170a.databases.neo4j.io';
const NEO4J_USER = 'neo4j';
const NEO4J_PASSWORD = '8QKjaQU-B9oBvXHWm_Oy0m2Yj8JffBMUE-Y9OkpqNcE';

// Go API Configuration
const API_URL = 'http://localhost:8081/api/v1/lake/neo4j';

// Initialize Neo4j driver
const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);

async function fetchNeo4jData() {
  const session = driver.session();
  const dataToIngest = [];
  
  try {
    console.log('📊 Fetching data from Neo4j...');
    
    // Query to get Farm-Device-Reading relationships
    const query = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading) 
      RETURN f, d, r
    `;
    
    const result = await session.run(query);
    
    console.log(`✓ Found ${result.records.length} records in Neo4j\n`);
    
    // Transform Neo4j data for the API
    result.records.forEach((record) => {
      const farm = record.get('f');
      const device = record.get('d');
      const reading = record.get('r');
      
      // Create a structured document
      const document = {
        farm: farm.properties,
        device: device.properties,
        reading: reading.properties,
        neo4jLabels: {
          farm: farm.labels,
          device: device.labels,
          reading: reading.labels
        }
      };
      
      dataToIngest.push(document);
    });
    
    return dataToIngest;
    
  } catch (error) {
    console.error('❌ Error fetching Neo4j data:', error.message);
    throw error;
  } finally {
    await session.close();
  }
}

async function pushToAPI(data) {
  try {
    console.log(`📤 Pushing ${data.length} documents to Go API...`);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: data,
        tags: ['neo4j', 'agriculture', 'iot', 'sensor-data', 'farm-monitoring', 'lab3']
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✓ Successfully pushed to Data Lake!');
      console.log(`  - Count: ${result.data.count}`);
      console.log(`  - Source: ${result.data.sourceDB}`);
      console.log(`  - Ingested At: ${result.data.ingestedAt}`);
      console.log(`  - Inserted IDs: ${result.data.insertedIds.length} documents`);
    } else {
      throw new Error(result.message);
    }
    
  } catch (error) {
    console.error('❌ Error pushing to API:', error.message);
    throw error;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('DATA LAKE INTEGRATION - NEO4J TO MONGODB (VIA GO API)');
  console.log('='.repeat(80));
  console.log();
  
  try {
    // Check if API is running
    console.log('🔍 Checking if Go API is running...');
    try {
      const healthCheck = await fetch('http://localhost:8081/api/v1/health');
      if (!healthCheck.ok) {
        throw new Error('API health check failed');
      }
      console.log('✓ Go API is running\n');
    } catch (error) {
      console.error('❌ Cannot connect to Go API at http://localhost:8081');
      console.error('   Make sure to run: go run main.go\n');
      process.exit(1);
    }
    
    // Fetch data from Neo4j
    const neo4jData = await fetchNeo4jData();
    
    if (neo4jData.length === 0) {
      console.log('⚠️  No data found in Neo4j. Please create sample data first.');
      console.log('   See SETUP_INSTRUCTIONS.md for Neo4j setup\n');
      process.exit(1);
    }
    
    console.log('Sample document structure:');
    console.log(JSON.stringify(neo4jData[0], null, 2));
    console.log();
    
    // Push to MongoDB via Go API
    await pushToAPI(neo4jData);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS: Neo4j data pushed to MongoDB lake collection');
    console.log('='.repeat(80));
    console.log('\n📍 Next Steps:');
    console.log('  1. Open MongoDB Compass');
    console.log('  2. Connect to: mongodb+srv://i40:dbms2@cluster0.lixbqmp.mongodb.net/');
    console.log('  3. Navigate to: Project1 → lake');
    console.log('  4. Filter by: { sourceDB: "Neo4j" }');
    console.log('  5. Take screenshot showing metadata fields\n');
    
  } catch (error) {
    console.error('\n❌ Failed to complete data lake integration:', error.message);
    process.exit(1);
  } finally {
    await driver.close();
  }
}

// Run the integration
main();
