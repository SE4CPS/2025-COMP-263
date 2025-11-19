// app.js
require("dotenv").config(); // loads .env from the current folder

const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();

console.log("ENV CHECK", { HOST: process.env.MONGO_HOST, USER: process.env.MONGO_USER });


app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
 
// For parsing application/json
        app.use(express.json());
        // For parsing application/x-www-form-urlencoded
        app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const HOST = process.env.MONGO_HOST;   // e.g., mongodb+srv://cluster0.lixbqmp.mongodb.net
const USER = process.env.MONGO_USER;   // comp263_2025
const PASS = process.env.MONGO_PASS;   // your password

// Validate env early with clear messages
(function validateEnv() {
    const missing = [];
    if (!HOST) missing.push("MONGO_HOST");
    if (!USER) missing.push("MONGO_USER");
    if (!PASS) missing.push("MONGO_PASS");
    if (missing.length) {
        console.error("❌ Missing env var(s):", missing.join(", "));
        console.error("   Make sure .env is next to app.js and contains those keys.");
        process.exit(1);
    }
})();

// Create client with host-only SRV and separate auth (works well on Atlas)
const client = new MongoClient(`${HOST}/?retryWrites=true&w=majority`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    auth: { username: USER, password: PASS },
    authSource: "admin"
});

let collection;

(async function start() {
    try {
        console.log("⏳ Connecting to MongoDB...");
        await client.connect();
        await client.db("admin").command({ ping: 1 });

        const db = client.db("Lab2");
        collection = db.collection("Agriculture");

        const host = HOST.replace(/^mongodb\+srv:\/\//, "");
        const count = await collection.estimatedDocumentCount();
        console.log(`✅ Connected to ${host}`);
        console.log(`📚 Lab2.Agriculture docs: ${count}`);

        app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
    } catch (err) {
        console.error("❌ DB connection error:", err.message || err);
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


app.post("/agriculture", async (req, res) => {
  try {
    console.log("Trying to post data.");
    const doc = req.body;
    console.log(doc);
    const result = await collection.insertMany(doc);
    res.json({ insertedId: result.insertedId });
  } catch (e) {
    res.status(500).json({ error: String(e) });
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