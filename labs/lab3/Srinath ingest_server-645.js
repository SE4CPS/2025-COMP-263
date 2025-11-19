// ingest_server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const mongo = new MongoClient(process.env.MONGO_HOST, {
  auth: { username: process.env.MONGO_USER, password: process.env.MONGO_PASS }
});
let col;
(async () => {
  await mongo.connect();
  col = mongo.db(process.env.MONGO_DB).collection(process.env.MONGO_LAKE_COLLECTION);
  console.log('Ingest API ready');
})();

app.post('/ingest/indexeddb', async (req, res) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    if (!rows.length) return res.status(400).json({ ok:false, error:'empty' });
    const docs = rows.map(r => ({
      ...r,
      sourceDB: 'IndexedDB',
      ingestedAt: new Date().toISOString(),
      tags: ['browser', r.sensorId].filter(Boolean),
    }));
    const r = await col.insertMany(docs, { ordered:false });
    res.json({ ok:true, inserted: r.insertedCount });
  } catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

app.listen(4000, () => console.log('http://localhost:4000'));
