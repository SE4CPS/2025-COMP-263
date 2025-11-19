


require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.PORT || '3000', 10);
const mongo = new MongoClient(process.env.MONGO_URI);

let collection;

(async function init() {
  try {
    await mongo.connect();
    const db = mongo.db(process.env.MONGO_DB);
    collection = db.collection(process.env.MONGO_LAKE_COLLECTION);
    console.log(`Mongo connected → ${process.env.MONGO_DB}/${process.env.MONGO_LAKE_COLLECTION}`);
    app.listen(PORT, () => console.log(`Ingest server running at http://localhost:${PORT}`));
  } catch (err) {
    console.error('Mongo init error:', err.message);
    process.exit(1);
  }
})();

app.get('/', (_req, res) => res.send('IndexedDB ingest server is running'));

/**
 * Body shape:
 * {
 *   "metadata": { "author": "...", "last_sync": "ISO-UTC" },
 *   "docs": [{ sensorId, reading, timestamp (ISO-UTC), notes }, ...]
 * }
 */
app.post('/ingest', async (req, res) => {
  try {
    const { metadata, docs } = req.body || {};

    if (!Array.isArray(docs) || docs.length < 1) {
      return res.status(400).json({ error: 'Field "docs" must be a non-empty array.' });
    }
    if (!metadata || typeof metadata !== 'object') {
      return res.status(400).json({ error: 'Missing "metadata" object.' });
    }

    // Validate timestamps end with 'Z' (basic UTC check)
    const bad = docs
      .map(d => d?.timestamp)
      .filter(ts => typeof ts !== 'string' || !ts.endsWith('Z'));
    if (bad.length > 0) {
      return res.status(400).json({ error: 'All document timestamps must be UTC ISO strings ending with "Z".' });
    }

    const author = (metadata.author || process.env.DEFAULT_AUTHOR || '').trim();

    // Enrich docs
    const enriched = docs.map(d => {
      const base = {
        ...d,
        sourceDB: 'IndexedDB',
        ingestedAt: new Date().toISOString()
      };
      return author ? { ...base, author } : base;
    });

    const ops = [];
    if (enriched.length) ops.push(collection.insertMany(enriched, { ordered: true }));
    // Insert metadata as a separate doc (tagged)
    ops.push(collection.insertOne({ ...metadata, type: 'metadata', ingestedAt: new Date().toISOString() }));

    const [rDocs] = await Promise.all(ops);

    return res.json({
      message: 'Ingest complete',
      insertedDocs: rDocs?.insertedCount ?? enriched.length,
      insertedMetadata: 1
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Insert failed' });
  }
});