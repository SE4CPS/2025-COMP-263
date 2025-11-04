import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { createClient } from "redis";
import Reading from "./reading.js";

dotenv.config();
const app = express();
app.use(express.json());

// ========== 🔗 DATABASE CONNECTIONS ==========
await mongoose.connect(process.env.MONGODB_URI);
console.log("✅ MongoDB connected");

const redisClient = createClient();
redisClient.on("error", (err) => console.error("❌ Redis Error:", err));
await redisClient.connect();
console.log("✅ Redis connected");

// ===================================================================
// 1️⃣ CACHE-ASIDE STRATEGY
// ===================================================================
app.get("/cache-aside/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `reading:${sensorId}`;
  const start = Date.now(); // start timer

  try {
    // 1. Check cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      const duration = Date.now() - start;
      console.log(`🟢 Cache HIT | ${duration} ms`);
      return res.json({
        source: "Redis (Cache-Aside)",
        time: `${duration} ms`,
        data: JSON.parse(cached),
      });
    }

    // 2. Cache miss → Fetch from MongoDB
    const data = await Reading.findOne({ sensorId });
    if (!data) return res.status(404).json({ message: "Not found" });

    // 3. Store result in Redis for next time
    await redisClient.set(cacheKey, JSON.stringify(data));

    const duration = Date.now() - start;
    console.log(`🔴 Cache MISS | ${duration} ms`);
    res.json({
      source: "MongoDB (Cache-Aside)",
      time: `${duration} ms`,
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===================================================================
// 2️⃣ READ-THROUGH CACHING
// ===================================================================
app.get("/read-through/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `rt-reading:${sensorId}`;
  const start = Date.now();

  try {
    // 1. Try to read through cache layer
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      const duration = Date.now() - start;
      console.log(`🟢 Cache HIT (Read-Through) | ${duration} ms`);
      return res.json({
        source: "Redis (Read-Through)",
        time: `${duration} ms`,
        data: JSON.parse(cachedData),
      });
    }

    // 2. Cache miss → Fetch from MongoDB
    const reading = await Reading.findOne({ sensorId });
    if (!reading) return res.status(404).json({ message: "Not found" });

    // 3. Store fetched data with TTL
    await redisClient.set(cacheKey, JSON.stringify(reading), { EX: 60 });

    const duration = Date.now() - start;
    console.log(`🔴 Cache MISS (Read-Through) | ${duration} ms`);
    res.json({
      source: "MongoDB (Read-Through)",
      time: `${duration} ms`,
      data: reading,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===================================================================
// 3️⃣ TTL / EXPIRATION-BASED CACHING
// ===================================================================
app.get("/ttl/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `ttl-reading:${sensorId}`;
  const start = Date.now();

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      const duration = Date.now() - start;
      console.log(`🟢 TTL Cache HIT | ${duration} ms`);
      return res.json({
        source: "Redis (TTL Active)",
        time: `${duration} ms`,
        data: JSON.parse(cached),
      });
    }

    console.log("🔴 TTL Cache MISS → Fetching and setting 10s TTL...");
    const data = await Reading.findOne({ sensorId });
    if (!data) return res.status(404).json({ message: "Not found" });

    await redisClient.set(cacheKey, JSON.stringify(data), { EX: 10 });
    const duration = Date.now() - start;

    res.json({
      source: "MongoDB (TTL Cache Miss)",
      ttl: "10s",
      time: `${duration} ms`,
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 🔄 RESET TTL CACHE (optional for testing)
app.get("/reset-ttl/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `ttl-reading:${sensorId}`;
  await redisClient.del(cacheKey);
  console.log(`🧹 TTL Cache cleared for key: ${cacheKey}`);
  res.json({ message: `TTL cache cleared for ${sensorId}` });
});

// ===================================================================
app.listen(4000, () => console.log("🚀 Server running on port 4000"));
