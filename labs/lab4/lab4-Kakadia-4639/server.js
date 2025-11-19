// server.js
require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const { createClient } = require("redis");

const app = express();
app.use(express.json());

// --- Load from .env ---
const PORT = process.env.PORT || 3000;
const MONGO_HOST = process.env.MONGO_HOST;
const MONGO_DB = process.env.MONGO_DB;
const MONGO_COLLECTION = process.env.MONGO_LAKE_COLLECTION;
const REDIS_URL = process.env.REDIS_URL;

let mongoCollection;
let redisClient;

// --- Connect to both MongoDB and Redis ---
async function connectServices() {
  try {
    // Connect to MongoDB Atlas
    const mongoClient = new MongoClient(MONGO_HOST);
    await mongoClient.connect();
    const db = mongoClient.db(MONGO_DB);
    mongoCollection = db.collection(MONGO_COLLECTION);
    console.log(`✅ Connected to MongoDB Atlas database: ${MONGO_DB}, collection: ${MONGO_COLLECTION}`);

    // Connect to Redis
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on("error", (err) => console.error("❌ Redis Client Error:", err));
    await redisClient.connect();

    console.log("✅ Connected to Redis at:", REDIS_URL);
    const pong = await redisClient.ping();
    console.log("Redis ping response:", pong);

  } catch (err) {
    console.error("❌ Connection error:", err);
    process.exit(1);
  }
}

// --- Example test route ---
app.get("/", async (_req, res) => {
  const pong = await redisClient.ping();
  res.send(`🚀 Server connected to MongoDB & Redis | Redis PING: ${pong}`);
});



// 1️⃣ CACHE-ASIDE
// App checks cache first, if not found → fetch from MongoDB → store in Redis
app.get("/cache-aside/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `reading:${sensorId}`;

  try {
    // 1. Check Redis cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log("✅ Cache hit (Cache-Aside)");
      return res.json({ source: "cache", data: JSON.parse(cached) });
    }

    console.log("⚙️ Cache miss → querying MongoDB...");
    const data = await mongoCollection.findOne({ sensorId });

    if (!data) return res.status(404).send("No reading found for that sensor.");

    // 2. Store result in Redis for future
    await redisClient.set(cacheKey, JSON.stringify(data));
    res.json({ source: "mongodb", data });
  } catch (err) {
    console.error(err);
    res.status(500).send("Cache-Aside error");
  }
});


// 2️⃣ READ-THROUGH
// The cache layer always handles retrieval and populates itself automatically.
app.get("/read-through/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `reading:${sensorId}`;

  try {
    let cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log("✅ Read-Through Cache hit");
      return res.json({ source: "cache", data: JSON.parse(cached) });
    }

    // Cache miss → fetch from MongoDB
    console.log("⚙️ Read-Through Cache miss → querying DB...");
    const data = await mongoCollection.findOne({ sensorId });
    if (!data) return res.status(404).send("No reading found");

    // Redis handles "write-through" by populating immediately
    await redisClient.set(cacheKey, JSON.stringify(data));
    res.json({ source: "mongodb (via cache layer)", data });
  } catch (err) {
    console.error(err);
    res.status(500).send("Read-Through error");
  }
});


// 3️⃣ EXPIRATION-BASED (TTL)
// Cache entries expire automatically after TTL seconds
app.get("/expiration/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `reading:${sensorId}`;
  const TTL = parseInt(process.env.CACHE_TTL_SECONDS) || 60;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log("✅ TTL Cache hit");
      return res.json({ source: "cache", data: JSON.parse(cached) });
    }

    console.log("⚙️ TTL Cache miss → fetching from DB...");
    const data = await mongoCollection.findOne({ sensorId });
    if (!data) return res.status(404).send("No reading found");

    // Save to cache with expiration
    await redisClient.setEx(cacheKey, TTL, JSON.stringify(data));
    res.json({ source: "mongodb", ttl_seconds: TTL, data });
  } catch (err) {
    console.error(err);
    res.status(500).send("Expiration-Based caching error");
  }
});


// --- Start everything ---
connectServices();

app.listen(PORT, () => {
  console.log(`🌱 Node server running on http://localhost:${PORT}`);
});
