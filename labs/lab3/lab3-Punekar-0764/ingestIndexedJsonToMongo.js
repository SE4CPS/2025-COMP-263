/**
 * IndexedDB JSON → MongoDB Lake (upsert, with metadata)
 * - Reads exported JSON (from Lab 2 page)
 * - Adds/ensures: sourceDB, ingestedAt (UTC), tags, author
 * - Upserts into Project1.lake using a stable _id
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { MongoClient } = require('mongodb');
const fs = require('fs/promises');

// ---------- ENV ----------
const {
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
  const encUser = encodeURIComponent(MONGO_USER);
  const encPass = encodeURIComponent(MONGO_PASS);
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
  const mongoUri = buildMongoUri();

  // File path
  const file = process.argv[2] || path.join(__dirname, 'indexeddb_readings.json');
  const raw = await fs.readFile(file, 'utf8');
  const rows = JSON.parse(raw);

  // Transform to lake docs w/ metadata + stable _id
  const docs = rows.map(x => {
    const now = new Date().toISOString();
    const key =
      x._id || x.id || x.reading?.id || x.sensorId || x.timestamp || x.ts || now;
    const _id = `idx_${key}`;

    return {
      _id,
      sourceDB: 'IndexedDB',
      ingestedAt: x.ingestedAt || now,
      tags: Array.isArray(x.tags) ? x.tags : ['tablet', 'lab3'],
      author: AUTHOR,
      ...x
    };
  });

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

  console.log(`IndexedDB JSON → Mongo upserts: ${upserts}/${docs.length} into ${DB_NAME}.${COLL_NAME}`);
  await client.close();
})().catch(err => {
  console.error('IndexedDB→Mongo failed:', err.message);
  process.exit(1);
});
