require('dotenv').config();
const neo4j = require('neo4j-driver');
const { MongoClient } = require('mongodb');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const client = new MongoClient(process.env.MONGODB_URI);

function toNum(v) { return neo4j.isInt(v) ? v.toNumber() : v; }
function nowUTC() { return new Date().toISOString(); }

async function main() {
  const session = driver.session();
  try {
    const cypher = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f, d, r
      LIMIT 1000
    `;
    const res = await session.run(cypher);
    if (res.records.length === 0) {
      console.log('No Neo4j rows. Did you seed the graph?');
      return;
    }

    const docs = res.records.map(rec => {
      const f = rec.get('f').properties ?? {};
      const d = rec.get('d').properties ?? {};
      const r = rec.get('r').properties ?? {};
      return {
        sourceDB: 'Neo4j',
        ingestedAt: nowUTC(),
        tags: ['lab3','neo4j','agri'],
        farm: { name: f.name ?? f.farmName ?? '(unknown)' },
        device: { type: d.type ?? d.deviceType ?? d.model ?? '(unknown)' },
        reading: {
          value: toNum(r.value ?? r.reading ?? null),
          unit: r.unit ?? null,
          timestamp: r.timestamp ?? r.time ?? null
        }
      };
    });

    await client.connect();
    const coll = client.db(process.env.MONGO_DB).collection(process.env.MONGO_COLL);
    const result = await coll.insertMany(docs);
    console.log(`Inserted ${result.insertedCount} docs from Neo4j → MongoDB lake`);
  } catch (e) {
    console.error('Ingest error:', e.message);
  } finally {
    await session.close();
    await driver.close();
    await client.close().catch(()=>{});
  }
}

main();