require("dotenv").config();
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const { createClient } = require("redis");

const app = express();
const PORT = process.env.PORT || 3000;

const mongoClient = new MongoClient(process.env.MONGO_URI);
const redisClient = createClient({ url: process.env.REDIS_URL });
const TTL = Number(process.env.CACHE_TTL_SECONDS || 60);

async function start() {
  await mongoClient.connect();
  await redisClient.connect();
  console.log("Connected to MongoDB and Redis");

  const db = mongoClient.db(process.env.MONGO_DB);
  const readings = db.collection(process.env.MONGO_COLLECTION);

  // health (optional)
  app.get("/health", async (req, res) => {
    await redisClient.ping();
    res.json({ ok: true });
  });

  // 1. cache aside
  app.get("/cache-aside/:id", async (req, res) => {
    const id = req.params.id;
    const cacheKey = `reading:${id}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json({ source: "redis", data: JSON.parse(cached) });
    }

    const doc = await readings.findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return res.status(404).json({ error: "not found" });
    }

    await redisClient.set(cacheKey, JSON.stringify(doc));
    return res.json({ source: "mongo", data: doc });
  });

  // 2. read through
  app.get("/read-through/:id", async (req, res) => {
    const id = req.params.id;
    const cacheKey = `rt:reading:${id}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json({ source: "redis", data: JSON.parse(cached) });
    }

    const doc = await readings.findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return res.status(404).json({ error: "not found" });
    }

    await redisClient.set(cacheKey, JSON.stringify(doc));
    return res.json({ source: "mongo", data: doc });
  });

  // 3. ttl caching
  app.get("/ttl/:id", async (req, res) => {
    const id = req.params.id;
    const cacheKey = `ttl:reading:${id}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json({ source: "redis (not expired)", data: JSON.parse(cached) });
    }

    const doc = await readings.findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return res.status(404).json({ error: "not found" });
    }

    await redisClient.set(cacheKey, JSON.stringify(doc), { EX: TTL });
    return res.json({
      source: "mongo (cached with ttl)",
      ttlSeconds: TTL,
      data: doc
    });
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});
