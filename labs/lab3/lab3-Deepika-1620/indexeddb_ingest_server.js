require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

function requireEnv(keys) {
  const missing = keys.filter(k => !process.env[k] || process.env[k].trim() === '');
  if (missing.length) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
}
requireEnv(['MONGO_URI', 'MONGO_DB', 'MONGO_COLLECTION']);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const AUTHOR_FALLBACK = process.env.AUTHOR_NAME || 'Unknown';
const INDEXEDDB_SOURCE = process.env.INDEXEDDB_SOURCE_LABEL || 'IndexedDB';

let mongoClient, collection;

async function initMongo() {
  mongoClient = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  await mongoClient.connect();
  const db = mongoClient.db(process.env.MONGO_DB);
  collection = db.collection(process.env.MONGO_COLLECTION);
  // console.log(Mongo connected → ${process.env.MONGO_DB}/${process.env.MONGO_COLLECTION});
  console.log(`Mongo connected → ${process.env.MONGO_DB}/${process.env.MONGO_COLLECTION}`);

}

app.get('/', (_req, res) => res.send('IndexedDB ingest server OK'));

app.post('/ingest', async (req, res) => {
  try {
    const { metadata, docs } = req.body || {};
    if (!Array.isArray(docs) || docs.length !== 10) {
      return res.status(400).json({ error: 'You must send exactly 10 documents in "docs".' });
    }
    if (!metadata || typeof metadata !== 'object') {
      return res.status(400).json({ error: 'Missing "metadata" object.' });
    }

    // Basic UTC check for timestamps
    const badTs = docs
      .map(d => d.timestamp)
      .filter(ts => typeof ts !== 'string' || !ts.endsWith('Z'));
    if (badTs.length > 0) {
      return res.status(400).json({ error: 'All document timestamps must be UTC ISO strings ending with "Z".' });
    }

    const author = metadata.author || AUTHOR_FALLBACK;
    const ingestedAt = new Date().toISOString();

    const enriched = docs.map(d => ({
      ...d,
      author,
      sourceDB: INDEXEDDB_SOURCE,
      ingestedAt
    }));

    const r1 = await collection.insertMany(enriched, { ordered: true });
    const r2 = await collection.insertOne({
      ...metadata,
      _type: 'metadata',
      sourceDB: INDEXEDDB_SOURCE,
      ingestedAt,
      author
    });

    res.json({
      message: 'IndexedDB payload ingested.',
      insertedDocs: r1.insertedCount,
      insertedMetadata: r2.insertedId ? 1 : 0
    });
  } catch (err) {
    console.error('Ingest error:', err.message);
    res.status(500).json({ error: err.message || 'Insert failed' });
  }
});

const PORT = 3000;
initMongo()
  .then(() => app.listen(PORT, () => console.log(`Ingest server running at http://localhost:${PORT}`)))
  .catch(err => {
    console.error('Mongo init error:', err.message);
    process.exit(1);
  });
