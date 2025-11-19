/**
 * Neo4j -> MongoDB lake (shared cluster) with author stamping.
 * Supports Option-B env names used in your class.
 */
require('dotenv').config();
const neo4j = require('neo4j-driver');
const { MongoClient } = require('mongodb');

// Accept both env styles
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_HOST;
const MONGO_DB  = process.env.MONGODB_DB  || process.env.MONGO_DB || 'LabLake';
const MONGO_COL = process.env.MONGODB_COLLECTION || process.env.MONGO_LAKE_COLLECTION || 'lake';

const AUTHOR    = process.env.AUTHOR || 'Ram Mallineni';
const STUDENTID = process.env.STUDENT_ID || '5708';

const NEO_URI = process.env.NEO4J_URI;
const NEO_USER = process.env.NEO4J_USER;
const NEO_PASS = process.env.NEO4J_PASSWORD;
const NEO_DB   = process.env.NEO4J_DB || 'neo4j';

if (!MONGO_URI) { console.error('❌ Missing Mongo URI (MONGODB_URI or MONGO_HOST)'); process.exit(1); }
if (!NEO_URI || !NEO_USER || !NEO_PASS) { console.error('❌ Missing Neo4j envs'); process.exit(1); }

console.log('→ Using Mongo:', { uri: MONGO_URI, db: MONGO_DB, collection: MONGO_COL });
console.log('→ Using Neo4j:', { uri: NEO_URI, database: NEO_DB });
console.log('→ Author:', { author: AUTHOR, studentId: STUDENTID });

const neoDriver = neo4j.driver(NEO_URI, neo4j.auth.basic(NEO_USER, NEO_PASS));

async function main() {
  const mclient = new MongoClient(MONGO_URI);
  const session = neoDriver.session({ database: NEO_DB });
  try {
    await mclient.connect();
    const col = mclient.db(MONGO_DB).collection(MONGO_COL);

    const cypher = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f{.*, id: f.id} AS farm, d{.*, id: d.id} AS device, r{.*} AS reading
      ORDER BY f.name, d.id, r.ts
    `;
    const result = await session.run(cypher);
    const now = new Date().toISOString();

    const docs = result.records.map(rec => {
      const farm = rec.get('farm');
      const device = rec.get('device');
      const reading = rec.get('reading');
      return {
        author: AUTHOR,
        studentId: STUDENTID,
        lab: 'lab3',
        course: 'DBMS2',
        sourceDB: 'Neo4j',
        ingestedAt: now,
        tags: ['agri','farm-device-reading','neo4j', `author:${AUTHOR}`, `sid:${STUDENTID}`],
        farm:   { id: farm.id, name: farm.name, location: farm.location },
        device: { id: device.id, type: device.type, model: device.model },
        reading: {
          rid: reading.rid,
          metric: reading.metric,
          value: reading.value,
          unit: reading.unit,
          ts: reading.ts ? reading.ts.toString() : null
        }
      };
    });

    if (!docs.length) return console.log('No Neo4j rows found. Did you seed?');

    const res = await col.insertMany(docs);
    const count = res.insertedCount ?? Object.keys(res.insertedIds).length;
    console.log(`✅ Inserted ${count} Neo4j docs for author="${AUTHOR}" into ${MONGO_DB}.${MONGO_COL}`);
  } catch (e) {
    console.error('Neo4j→Mongo ingest error:', e);
  } finally {
    await session.close();
    await neoDriver.close();
    await mclient.close();
  }
}
main();