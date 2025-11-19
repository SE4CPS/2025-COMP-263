// labs/lab3/pushNeo4jToMongo.js
require('dotenv').config();
const neo4j = require('neo4j-driver');
const { MongoClient } = require('mongodb');

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

    const cypher = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f{.*} AS farm, d{.*} AS device, r{.*, ts: toString(r.ts)} AS reading
    `;
    const result = await session.run(cypher);

    const now = new Date().toISOString();
    const docs = result.records.map(rec => ({
      farm: rec.get('farm'),
      device: rec.get('device'),
      reading: rec.get('reading'),
      sourceDB: 'Neo4j',
      ingestedAt: now,
      tags: ['graph', 'neo4j']
    }));

    if (docs.length) {
      await col.insertMany(docs, { ordered: false });
      console.log(`Inserted ${docs.length} docs into Mongo lake`);
    } else {
      console.log('No graph data found in Neo4j');
    }
  } catch (err) {
    console.error('Pipeline error:', err.message);
  } finally {
    await session.close();
    await driver.close();
    await mongo.close();
  }
}

main();