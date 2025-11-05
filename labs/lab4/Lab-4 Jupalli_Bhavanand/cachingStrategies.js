require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const redis = require("redis");

const app = express();
const port = 3000;

const mongoClient = new MongoClient(process.env.MONGODB_URI);
const redisClient = redis.createClient({ url: process.env.REDIS_URI });

// Connect to MongoDB and Redis
async function connectDBs() {
    await mongoClient.connect();
    await redisClient.connect();
    console.log("Connected to MongoDB and Redis");
}

const db = mongoClient.db("AgriDB");
const collection = db.collection("readings");

// --- Helper: create unique cache key ---
function makeCacheKey(sensorId, author) {
    return `sensor:${sensorId}:author:${author}`;
}

// --- Cache-Aside ---
async function cacheAside(sensorId, author) {
    const key = makeCacheKey(sensorId, author);
    const cached = await redisClient.get(key);
    if (cached) return JSON.parse(cached);

    const data = await collection.findOne({ sensorId, "meta.author": author });
    if (data) await redisClient.set(key, JSON.stringify(data), { EX: 10 }); // TTL 10s
    return data;
}

// --- Read-Through ---
async function readThrough(sensorId, author) {
    const key = makeCacheKey(sensorId, author);
    const cached = await redisClient.get(key);
    if (cached) return JSON.parse(cached);

    const data = await collection.findOne({ sensorId, "meta.author": author });
    if (data) await redisClient.set(key, JSON.stringify(data), { EX: 10 }); // TTL 10s
    return data;
}

// --- Expiration-Based (TTL) ---
async function ttlExample(sensorId, author) {
    const key = makeCacheKey(sensorId, author);
    const cached = await redisClient.get(key);
    if (cached) return JSON.parse(cached);

    const data = await collection.findOne({ sensorId, "meta.author": author });
    if (data) await redisClient.set(key, JSON.stringify(data), { EX: 5 }); // TTL 5s
    return data;
}

// --- Express routes ---
app.get("/cache-aside/:sensorId/:author", async (req, res) => {
    const { sensorId, author } = req.params;
    const data = await cacheAside(sensorId, author);
    res.json(data);
});

app.get("/read-through/:sensorId/:author", async (req, res) => {
    const { sensorId, author } = req.params;
    const data = await readThrough(sensorId, author);
    res.json(data);
});

app.get("/ttl/:sensorId/:author", async (req, res) => {
    const { sensorId, author } = req.params;
    const data = await ttlExample(sensorId, author);
    res.json(data);
});

// Start server after connecting to DBs
connectDBs().then(() => {
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
});
