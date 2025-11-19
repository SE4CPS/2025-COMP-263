// app.js
require("dotenv").config(); // loads .env from the current folder

const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

console.log("ENV CHECK", {
  HOST: process.env.MONGO_HOST,
  USER: process.env.MONGO_USER,
  DB: process.env.MONGO_DB,
  COLLECTION: process.env.MONGO_LAKE_COLLECTION
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.MONGO_HOST;
const USER = process.env.MONGO_USER;
const PASS = process.env.MONGO_PASS;
const DB_NAME = process.env.MONGO_DB;
const COLLECTION_NAME = process.env.MONGO_LAKE_COLLECTION;

// Validate env early
(function validateEnv() {
  const missing = [];
  if (!HOST) missing.push("MONGO_HOST");
  if (!USER) missing.push("MONGO_USER");
  if (!PASS) missing.push("MONGO_PASS");
  if (!DB_NAME) missing.push("MONGO_DB");
  if (!COLLECTION_NAME) missing.push("MONGO_LAKE_COLLECTION");
  if (missing.length) {
    console.error("❌ Missing env var(s):", missing.join(", "));
    console.error("   Make sure .env is next to app.js and contains those keys.");
    process.exit(1);
  }
})();

// Create client with SRV connection string and separate auth
const client = new MongoClient(`${HOST}?retryWrites=true&w=majority`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  auth: { username: USER, password: PASS },
  authSource: "admin"
});

let collection;

(async function start() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await client.connect();
    await client.db("admin").command({ ping: 1 });

    const db = client.db(DB_NAME);
    collection = db.collection(COLLECTION_NAME);

    const host = HOST.replace(/^mongodb\+srv:\/\//, "");
    const count = await collection.estimatedDocumentCount();
    console.log(`Connected to ${host}`);
    console.log(`${DB_NAME}.${COLLECTION_NAME} docs: ${count}`);

    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  } catch (err) {
    console.error("DB connection error:", err.message || err);
    process.exit(1);
  }
})();

app.get("/agriculture", async (_req, res) => {
    try {
        if (!collection) return res.status(503).send("Database not initialized");
        const docs = await collection.find({}).toArray();
        res.json(docs);
    } catch (e) {
        res.status(500).send(String(e));
    }
});

// Optional debug endpoints
app.get("/health", (_req, res) => {
    res.json({
        ok: Boolean(collection),
        cluster: HOST.replace(/^mongodb\+srv:\/\//, "")
    });
});

app.get("/debug/agriculture", async (_req, res) => {
    try {
        if (!collection) return res.status(503).send("Database not initialized");
        const count = await collection.estimatedDocumentCount();
        const sample = await collection.find({}).limit(5).toArray();
        res.json({ db: "Lab2", collection: "Agriculture", count, sample });
    } catch (e) {
        res.status(500).json({ error: String(e) });
    }
});

app.post("/agriculture/insert", async (req, res) => {
  try {
    console.log("Trying to post data.");
    const doc = req.body;
    console.log(doc);
    const result = await collection.insertMany(doc);
    res.json({ inserted: result.length });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
