require('dotenv').config();
const neo4j = require('neo4j-driver');
const { MongoClient } = require('mongodb');

function requireEnv(keys) {
  const missing = keys.filter(k => !process.env[k] || process.env[k].trim() === '');
  if (missing.length) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('➡️  Please check your .env file and try again.');
    process.exit(1);
  }
}

requireEnv(['NEO4J_URI', 'NEO4J_USER', 'NEO4J_PASSWORD', 'MONGO_URI', 'MONGO_DB', 'MONGO_COLLECTION']);

const AUTHOR_NAME = process.env.AUTHOR_NAME || 'Unknown';
const SOURCE_LABEL = process.env.SOURCE_LAKE_LABEL || 'Neo4j';

(async function main() {
  const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
  );
  const session = driver.session();
  const mongo = new MongoClient(process.env.MONGO_URI);

  try {
    await mongo.connect();
    const col = mongo.db(process.env.MONGO_DB).collection(process.env.MONGO_COLLECTION);

   const cypher = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f{.*} AS farm, d{.*} AS device, r{.*, ts: toString(r.ts)} AS reading
    `;
    const result = await session.run(cypher);

    const now = new Date().toISOString();
    const docs = result.records.map((rec) => ({
      farm: rec.get('farm'),
      device: rec.get('device'),
      reading: rec.get('reading'),
      sourceDB: SOURCE_LABEL,
      ingestedAt: now,
      author: AUTHOR_NAME
    }));

    if (!docs.length) {
      console.log('No Neo4j data found to insert.');
      return;
    }

    const { insertedCount } = await col.insertMany(docs, { ordered: true });
    console.log(`Inserted ${insertedCount} Neo4j documents into ${process.env.MONGO_DB}.${process.env.MONGO_COLLECTION}.`);
  } catch (err) {
    console.error('Write pipeline error:', err.message);
  } finally {
    await session.close();
    await driver.close();
    await mongo.close();
  }

})();