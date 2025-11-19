require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const MONGO_URI = `${process.env.MONGO_HOST}?authSource=admin&retryWrites=true&w=majority`;
const mongo = new MongoClient(MONGO_URI, {
  auth: { username: process.env.MONGO_USER, password: process.env.MONGO_PASS }
});

async function withCollection(fn) {
  await mongo.connect();
  const col = mongo.db(process.env.MONGO_DB)
                   .collection(process.env.MONGO_LAKE_COLLECTION);
  return fn(col);
}

app.post('/agriculture', async (req, res) => {
  try {
    const input = Array.isArray(req.body) ? req.body : [req.body];

    const tagQuery = (req.query.tags || '').toString().trim();
    const defaultTags = tagQuery ? tagQuery.split(',').map(s => s.trim()).filter(Boolean) : [];
    const now = new Date().toISOString();

    const docs = input.map(d => ({
      ...d,
      sourceDB: 'IndexedDB',
      ingestedAt: now,
      tags: Array.isArray(d.tags) ? d.tags : defaultTags
    }));

    await withCollection(col => col.insertMany(docs, { ordered: false }));
    res.json({ ok: true, inserted: docs.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    await mongo.close();
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API ready on http://localhost:${port}`));