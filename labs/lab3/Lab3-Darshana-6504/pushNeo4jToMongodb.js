// labs/lab3/pushNeo4jToMongo.js
require('dotenv').config();
const neo4j = require('neo4j-driver');
const { MongoClient } = require('mongodb');

// Helper functions
const nowUTC = () => new Date().toISOString();
const toNum = (val) => {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

// Build MongoDB connection string using env vars
const MONGO_URI = `${process.env.MONGO_HOST}?authSource=admin&retryWrites=true&w=majority`;

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const mongo = new MongoClient(MONGO_URI, {
  auth: { username: process.env.MONGO_USER, password: process.env.MONGO_PASS }
});

async function main() {
  const session = driver.session();
  try {
    await mongo.connect();
    const col = mongo.db(process.env.MONGO_DB)
                    .collection(process.env.MONGO_LAKE_COLLECTION);

    // Query Neo4j graph
    const result = await session.run(`
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f.id as farmId, 
             f.name as farmName,
             f.location as farmLocation,
             d.id as deviceId,
             d.type as deviceType,
             d.model as deviceModel,
             d.manufacturer as deviceManufacturer,
             r.value as readingValue,
             r.unit as readingUnit,
             toString(r.timestamp) as readingTimestamp
      LIMIT 10
    `);

    const docs = result.records.map(rec => ({
      sourceDB: 'Neo4j',
      ingestedAt: nowUTC(),
      author: 'Darshana Patil',
      studentId: '6504',
      tags: ['lab3', 'neo4j', 'agri', 'darshana-6504'],
      farm: {
        id: rec.get('farmId'),
        name: rec.get('farmName'),
        location: rec.get('farmLocation')
      },
      device: {
        id: rec.get('deviceId'),
        type: rec.get('deviceType'),
        model: rec.get('deviceModel'),
        manufacturer: rec.get('deviceManufacturer')
      },
      reading: {
        value: toNum(rec.get('readingValue')),
        unit: rec.get('readingUnit'),
        timestamp: rec.get('readingTimestamp')
      }
    }));

    console.log('Documents to insert:', JSON.stringify(docs, null, 2));

    if (docs.length) {
      const result = await col.insertMany(docs, { ordered: false });
      console.log(`Successfully inserted ${result.insertedCount} documents from Neo4j → MongoDB`);
      
      // Verify the insertion by reading back the data
      console.log('\nVerifying inserted documents:');
      const inserted = await col.find({ sourceDB: 'Neo4j', author: 'Darshana Patil' }).toArray();
      console.log(`Found ${inserted.length} documents with your name`);
      console.log('Sample document:', JSON.stringify(inserted[0], null, 2));
    } else {
      console.log('No graph data found in Neo4j');
    }
  } catch (err) {
    console.error('Pipeline error:', err.message);
    console.error(err);
  } finally {
    await session.close();
    await driver.close();
    await mongo.close();
  }
}

main();