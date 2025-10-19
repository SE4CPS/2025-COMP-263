const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();

// CORS for browser calls
app.use(cors({ origin: true, methods: ["GET","POST","OPTIONS"], allowedHeaders: ["Content-Type"] }));
// IMPORTANT: scope preflight to real route (no "*" on Express 5)
app.options("/ingest", cors());

app.use(express.json({ limit: "10mb" }));

const { MONGODB_URI, MONGO_DB, MONGO_COLLECTION, PORT = 4000 } = process.env;

let coll;

// connect and start
(async () => {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  coll = client.db(MONGO_DB).collection(MONGO_COLLECTION);
  app.listen(PORT, () => console.log(`✅ Ingest API running on http://localhost:${PORT}`));
})().catch(err => {
  console.error("Failed to start:", err);
  process.exit(1);
});

// POST /ingest
app.post("/ingest", async (req, res) => {
  try {
    const { sourceDB, data, tags = [] } = req.body || {};
    if (!sourceDB || !Array.isArray(data)) {
      return res.status(400).json({ error: "sourceDB and data[] are required" });
    }

    const now = new Date().toISOString();
    const docs = (data || []).map(d => ({
      ...d,
      sourceDB,
      ingestedAt: now,
      tags,
      _lake: { sourceDB, ingestedAt: now, tags }
    }));

    if (!docs.length) return res.json({ inserted: 0 });

    const result = await coll.insertMany(docs, { ordered: false });
    res.json({ inserted: result.insertedCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
