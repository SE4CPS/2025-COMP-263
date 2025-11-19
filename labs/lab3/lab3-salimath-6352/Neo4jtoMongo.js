require('dotenv').config();
const neo4j = require('neo4j-driver');
const { MongoClient } = require('mongodb');

// Build MongoDB connection string
const MONGO_URI = `${process.env.MONGO_HOST}?authSource=admin&retryWrites=true&w=majority`;

// Initialize drivers
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const mongo = new MongoClient(MONGO_URI, {
  auth: {
    username: process.env.MONGO_USER,
    password: process.env.MONGO_PASS
  }
});

async function main() {
  const session = driver.session();
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongo.connect();
    const collection = mongo.db(process.env.MONGO_DB)
                            .collection(process.env.MONGO_LAKE_COLLECTION);

    console.log("🔍 Pulling data from Neo4j...");
    const result = await session.run(`
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f{.*} AS farm, d{.*} AS device, r{.*} AS reading
    `);

    const docs = result.records.map(rec => ({
      farm: rec.get('farm'),
      device: rec.get('device'),
      reading: rec.get('reading'),
      sourceDB: "Neo4j",
      ingestedAt: new Date().toISOString()
    }));

    console.log(`📊 Found ${docs.length} records in Neo4j`);

    if (docs.length > 0) {
      await collection.insertMany(docs, { ordered: false });
      console.log(`✅ Inserted ${docs.length} documents into MongoDB`);
    } else {
      console.log("⚠️ No graph data found in Neo4j!");
    }
  } catch (err) {
    console.error("❌ Pipeline error:", err.message);
  } finally {
    await session.close();
    await driver.close();
    await mongo.close();
  }
}

main();
