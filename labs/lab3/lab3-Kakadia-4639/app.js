// app.js
require("dotenv").config(); // loads .env from the current folder

const express = require("express");
const cors = require('cors')
const { MongoClient } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

console.log("ENV CHECK", { HOST: process.env.MONGO_HOST, USER: process.env.MONGO_USER });

const PORT = process.env.PORT || 3000;
const HOST = process.env.MONGO_HOST;   // e.g., mongodb+srv://cluster0.lixbqmp.mongodb.net
const USER = process.env.MONGO_USER;   // comp263_2025
const PASS = process.env.MONGO_PASS;   // your password
const DB = process.env.MONGO_DB;
const LAKE = process.env.MONGO_LAKE_COLLECTION;

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

        const db = client.db(DB);
        collection = db.collection(LAKE);

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

app.post("/farmData", async (_req, res) => {
    try{
        if(!collection) return res.status(503).send("Database not initialized");
        const docs = _req.body;
        if(!Array.isArray(docs)) {
            return res.status(400).send("Data should be an array of records");
        }
        const result = await collection.insertMany(docs);
        res.status(201).json({
            message: "Data Created Successfully",
            insertedCount: result.insertedCount
        });
    } catch (e){
        res.status(500).send(String(e));
    }
})


