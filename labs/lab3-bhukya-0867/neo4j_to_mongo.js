require('dotenv').config();
const neo4j = require('neo4j-driver');
const { MongoClient } = require('mongodb');

const {
  NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD,
  MONGODB_URI, MONGO_DB, MONGO_COLLECTION
} = process.env;

(async () => {
  // --- connect to Neo4j ---
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD));
  const session = driver.session();

  // --- connect to MongoDB ---
  const mclient = new MongoClient(MONGODB_URI);
  await mclient.connect();
  const coll = mclient.db(MONGO_DB).collection(MONGO_COLLECTION);

  try {
    // Query MUST return: farm, deviceType, value, timestamp
    const cypher = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN 
        f.name AS farm,
        d.type AS deviceType,
        r.value AS value,
        r.timestamp AS timestamp
    `;

    const result = await session.run(cypher);

    const docs = result.records.map(r => ({
      farm: r.get('farm'),
      deviceType: r.get('deviceType'),
      value: Number(r.get('value')),
      timestamp: String(r.get('timestamp')),
      _lake: {
        sourceDB: 'Neo4j',
        ingestedAt: new Date().toISOString(),
        tags: ['lab3', 'neo4j']
      }
    }));

    if (!docs.length) {
      console.log('No Neo4j rows found. (Tip: check labels/properties or adjust Cypher).');
    } else {
      const ins = await coll.insertMany(docs, { ordered: false });
      console.log(`Inserted ${ins.insertedCount} Neo4j docs into ${MONGO_DB}.${MONGO_COLLECTION}`);
    }
  } catch (e) {
    console.error('Neo4j→Mongo failed:', e);
  } finally {
    await session.close();
    await driver.close();
    await mclient.close();
  }
})();
