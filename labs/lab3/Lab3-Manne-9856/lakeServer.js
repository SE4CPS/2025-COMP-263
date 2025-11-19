require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_HOST;
const MONGO_DB  = process.env.MONGODB_DB  || process.env.MONGO_DB || 'Project1';
const MONGO_COL = process.env.MONGODB_COLLECTION || process.env.MONGO_LAKE_COLLECTION || 'lake';
const PORT      = process.env.PORT || 4000;

const AUTHOR    = process.env.AUTHOR || 'Sai Manne';
const STUDENTID = process.env.STUDENT_ID || 'XXXX';

if (!MONGO_URI) { console.error('❌ Missing Mongo URI'); process.exit(1); }
console.log('→ Lake server using Mongo:', { uri: MONGO_URI, db: MONGO_DB, collection: MONGO_COL, author: AUTHOR });

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, author: AUTHOR }));

app.post('/ingest/indexeddb', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: 'No items' });
    const now = new Date().toISOString();
    const docs = items.map(d => ({
      author: AUTHOR, studentId: STUDENTID, lab: 'lab3', course: 'DBMS2',
      sourceDB: 'IndexedDB', ingestedAt: d.ingestedAt || now,
      tags: Array.isArray(d.tags) ? [...d.tags, `author:${AUTHOR}`, `sid:${STUDENTID}`] : ['indexeddb', `author:${AUTHOR}`, `sid:${STUDENTID}`],
      indexedDb: d.indexedDb ?? d.indexeddb ?? d
    }));
    const client = new MongoClient(MONGO_URI); await client.connect();
    try {
      const col = client.db(MONGO_DB).collection(MONGO_COL);
      const result = await col.insertMany(docs);
      const inserted = result.insertedCount ?? Object.keys(result.insertedIds).length;
      res.json({ inserted, author: AUTHOR });
    } finally { await client.close(); }
  } catch (e) {
    console.error('Ingest error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`🌊 Lake server listening on http://localhost:${PORT} (author=${AUTHOR})`));