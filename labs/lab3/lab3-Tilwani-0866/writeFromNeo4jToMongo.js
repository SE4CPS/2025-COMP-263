// writeFromNeo4jToMongo.js
require('dotenv').config();
const neo4j = require('neo4j-driver');
const { MongoClient } = require('mongodb');

// ======== Environment Variable Validation ========
const requiredVars = [
  'NEO4J_URI',
  'NEO4J_USER',
  'NEO4J_PASSWORD',
  'MONGO_URI',
  'MONGO_DB',
  'MONGO_LAKE_COLLECTION'
];

const missingVars = requiredVars.filter(
  (key) => !process.env[key] || !String(process.env[key]).trim()
);

if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('➡️  Please check your .env file and try again.');
  process.exit(1);
}

// ======== Database Clients ========
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const uri =
  process.env.MONGO_URI ||
  `${process.env.MONGO_HOST}?authSource=admin&retryWrites=true&w=majority`;
const mongo = new MongoClient(uri, {
  auth: { username: process.env.MONGO_USER, password: process.env.MONGO_PASS }
});

async function main() {
  const session = driver.session();

  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongo.connect();

    const col = mongo
      .db(process.env.MONGO_DB)
      .collection(process.env.MONGO_LAKE_COLLECTION);

    console.log(`✅ Connected to MongoDB → ${process.env.MONGO_DB}/${process.env.MONGO_LAKE_COLLECTION}`);

    // ======== Query from Neo4j ========
    console.log('📡 Reading data from Neo4j...');
    const result = await session.run(`
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f{.*} AS farm, d{.*} AS device, r{.*, ts: toString(r.ts)} AS reading
    `);

    const author = (process.env.DEFAULT_AUTHOR || '').trim();
    const docs = result.records.map((rec) => {
      const base = {
        farm: rec.get('farm') || {},
        device: rec.get('device') || {},
        reading: rec.get('reading') || {},
        sourceDB: 'Neo4j',
        ingestedAt: new Date().toISOString(),
      };
      return author ? { ...base, author } : base;
    });

    if (docs.length === 0) {
      console.log('⚠️ No graph data found in Neo4j. Nothing to insert.');
      return;
    }

    // ======== Insert into MongoDB ========
    console.log(`🧾 Inserting ${docs.length} documents into MongoDB...`);
    const resultInsert = await col.insertMany(docs, { ordered: true });

    console.log(`✅ Successfully inserted ${resultInsert.insertedCount} documents into ${process.env.MONGO_DB}/${process.env.MONGO_LAKE_COLLECTION}.`);
  } catch (err) {
    console.error('❌ Pipeline error:', err.message);
  } finally {
    await session.close();
    await driver.close();
    await mongo.close();
  }
}

main();