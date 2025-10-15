/**
 * Neo4j → MongoDB Lake (upsert, with metadata)
 * - Reads (Farm)-[:HAS_DEVICE]->(Device)-[:GENERATES]->(Reading)
 * - Adds: sourceDB, ingestedAt (UTC), tags, author
 * - Upserts into Project1.lake using a stable _id
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const neo4j = require('neo4j-driver');
const { MongoClient } = require('mongodb');

// ---------- ENV ----------
const {
  NEO4J_URI,
  NEO4J_USER,
  NEO4J_PASSWORD,
  // Mongo styles supported:
  // 1) Single URL: MONGODB_URI
  // 2) Split parts: MONGO_HOST (mongodb+srv://<cluster>.mongodb.net/), MONGO_USER, MONGO_PASS
  MONGODB_URI,
  MONGO_HOST,
  MONGO_USER,
  MONGO_PASS,
  AUTHOR = 'Omkar',
} = process.env;

const DB_NAME =
  process.env.MONGO_DB ||
  process.env.MONGODB_DB ||
  'Project1';

const COLL_NAME =
  process.env.MONGO_COLL ||
  process.env.MONGO_LAKE_COLLECTION ||
  'lake';

function buildMongoUri() {
  if (MONGODB_URI && MONGODB_URI.startsWith('mongodb')) return MONGODB_URI;
  if (!MONGO_HOST || !MONGO_USER || !MONGO_PASS) {
    throw new Error(
      'Mongo connection missing. Set MONGODB_URI or MONGO_HOST + MONGO_USER + MONGO_PASS in .env'
    );
  }
  // Safely inject user/pass before host
  const encUser = encodeURIComponent(MONGO_USER);
  const encPass = encodeURIComponent(MONGO_PASS);
  // Expect MONGO_HOST like: mongodb+srv://cluster0.xxxxx.mongodb.net/?...
  if (!MONGO_HOST.startsWith('mongodb')) {
    throw new Error('MONGO_HOST must start with "mongodb". Example: mongodb+srv://cluster0.x.mongodb.net/?retryWrites=true&w=majority');
  }
  const host = MONGO_HOST.replace('mongodb+srv://', '');
  return `mongodb+srv://${encUser}:${encPass}@${host}`;
}

function guard(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ---------- MAIN ----------
(async () => {
  // Guards
  guard(NEO4J_URI && NEO4J_USER && NEO4J_PASSWORD, 'Missing NEO4J_* in .env');
  const mongoUri = buildMongoUri();

  // 1) Read from Neo4j
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session();
  const cypher = `
    MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
    RETURN f{.*} AS farm, d{.*} AS device, r{.*} AS reading
  `;
  const { records } = await session.run(cypher);
  await session.close();
  await driver.close();

  const now = new Date().toISOString();
  const docs = records.map(rec => {
    const farm = rec.get('farm') || {};
    const device = rec.get('device') || {};
    const reading = rec.get('reading') || {};

    // Choose a stable key for idempotent upsert
    const natural =
      reading.id ||
      `${farm.id || farm.name || 'farm'}_${device.id || device.type || 'device'}_${reading.ts || reading.timestamp || now}`;
    const _id = `neo4j_${natural}`;

    return {
      _id,
      sourceDB: 'Neo4j',
      ingestedAt: now,              // UTC
      tags: ['graph', 'lab3'],
      author: AUTHOR,
      farm,
      device,
      reading
    };
  });

  // 2) Upsert into Mongo
  const client = new MongoClient(mongoUri);
  await client.connect();
  const col = client.db(DB_NAME).collection(COLL_NAME);

  let upserts = 0;
  for (const d of docs) {
    const { _id, ...rest } = d;
    const r = await col.updateOne(
      { _id },
      { $set: rest, $setOnInsert: { _id } },
      { upsert: true }
    );
    if (r.upsertedCount || r.modifiedCount) upserts++;
  }

  console.log(`Neo4j → Mongo upserts: ${upserts}/${docs.length} into ${DB_NAME}.${COLL_NAME}`);
  await client.close();
})().catch(err => {
  console.error('Neo4j→Mongo failed:', err.message);
  process.exit(1);
});
