import express from "express";
import { createClient } from "redis";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const port = 3000;

// -----------------------------
// Redis Connection
// -----------------------------
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

redisClient.on("error", (err) => console.log("Redis error:", err));
await redisClient.connect();
console.log("✅ Connected to Redis!");

// -----------------------------
// MongoDB Connection
// -----------------------------
const mongoClient = new MongoClient(process.env.MONGO_URI);
await mongoClient.connect();
const db = mongoClient.db("AgriDB");
const collection = db.collection("readings");
console.log("✅ Connected to MongoDB Atlas!");

// -----------------------------
// Test Route
// -----------------------------
app.get("/", async (req, res) => {
  await redisClient.set("status", "OK");
  const cacheStatus = await redisClient.get("status");
  res.send(`Redis: ${cacheStatus}, MongoDB: Connected`);
});

// ======================================================
// 🧩 1️⃣ CACHE-ASIDE STRATEGY
// ======================================================
app.get("/cache-aside/:sensorId", async (req, res) => {
  const { sensorId } = req.params;

  // Step 1: Check cache first
  const cached = await redisClient.get(sensorId);
  if (cached) {
    console.log("Cache-Aside: Cache hit!");
    return res.json({ strategy: "Cache-Aside", source: "Redis", data: JSON.parse(cached) });
  }

  console.log("Cache-Aside: Cache miss — fetching from MongoDB...");
  const record = await collection.findOne({ sensorId });

  if (record) {
    await redisClient.set(sensorId, JSON.stringify(record));
  }

  res.json({ strategy: "Cache-Aside", source: "MongoDB", data: record });
});

// ======================================================
// 🧩 2️⃣ READ-THROUGH STRATEGY
// ======================================================
async function readThrough(sensorId) {
  let cached = await redisClient.get(sensorId);

  if (!cached) {
    console.log("Read-Through: Cache miss — loading from MongoDB...");
    const record = await collection.findOne({ sensorId });
    if (record) {
      await redisClient.set(sensorId, JSON.stringify(record));
      cached = JSON.stringify(record);
    }
  } else {
    console.log("Read-Through: Cache hit — returning from Redis!");
  }

  return JSON.parse(cached);
}

app.get("/read-through/:sensorId", async (req, res) => {
  const data = await readThrough(req.params.sensorId);
  res.json({ strategy: "Read-Through", data });
});

// ======================================================
// 🧩 3️⃣ EXPIRATION-BASED (TTL) STRATEGY
// ======================================================
app.get("/ttl/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  const ttlSeconds = 30;

  const cached = await redisClient.get(sensorId);
  if (cached) {
    console.log("TTL: Cache hit (TTL active)!");
    return res.json({ strategy: "TTL", source: "Redis Cache", data: JSON.parse(cached) });
  }

  console.log("TTL: Cache miss — fetching from MongoDB...");
  const record = await collection.findOne({ sensorId });

  if (record) {
    await redisClient.setEx(sensorId, ttlSeconds, JSON.stringify(record));
  }

  res.json({ strategy: "TTL", source: "MongoDB", data: record });
});

// ======================================================
// Server Start
// ======================================================
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
