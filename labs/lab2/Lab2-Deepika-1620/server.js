// server.js
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

// === MongoDB Atlas connection ===
const MONGO_URI = 'mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/';
const DB_NAME = 'Lab2';
const COLL_NAME = 'Agriculture';

let client, collection;

async function init() {
  try {
    client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    await client.connect();
    const db = client.db(DB_NAME);
    collection = db.collection(COLL_NAME);
    console.log('Connected to MongoDB Atlas:', DB_NAME, '/', COLL_NAME);
  } catch (err) {
    console.error('Mongo init error:', err);
    process.exit(1);
  }
}
init();

// Health-check endpoint
app.get('/', (_req, res) => res.send('Lab2 sync server is running'));

// Sync endpoint
app.post('/sync', async (req, res) => {
  try {
    const { docs, metadata } = req.body || {};

    // Validate 10 docs
    if (!Array.isArray(docs) || docs.length !== 10) {
      return res.status(400).send('You must send exactly 10 documents in "docs".');
    }
    if (!metadata || typeof metadata !== 'object') {
      return res.status(400).send('Missing "metadata" object.');
    }

    // Ensure timestamps are ISO strings
    const badTs = docs
      .map(d => d.timestamp)
      .filter(ts => typeof ts !== 'string' || !ts.endsWith('Z'));
    if (badTs.length > 0) {
      return res.status(400).send('All document timestamps must be UTC ISO strings ending with "Z".');
    }

    // Insert 10 docs
    const r1 = await collection.insertMany(docs, { ordered: true });

    // Insert metadata separately
    const r2 = await collection.insertOne({ ...metadata });

    res.json({
      insertedDocs: r1.insertedCount,
      insertedMetadata: r2.insertedId ? 1 : 0
    });

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message || 'Insert failed');
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
