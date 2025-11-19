import express from "express";
import { MongoClient } from "mongodb";
import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB + Redis setup
const mongoClient = new MongoClient(process.env.MONGODB_URI);
const redisClient = createClient({ url: process.env.REDISDB_URL });

// Connect to MongoDB & Redis
await mongoClient.connect();
await redisClient.connect();
console.log("Connected to MongoDB Atlas (LabLake.lake) and Redis successfully.");

const db = mongoClient.db("LabLake");
const lake = db.collection("lake");

// 1. Cache-Aside Strategy
app.get("/cache-aside/:id", async (req, res) => {
  const sensorId = req.params.id;
  console.time("Cache-Aside Time");

  const cached = await redisClient.get(sensorId);
  if (cached) {
    console.timeEnd("Cache-Aside Time");
    console.log("Cache hit (Cache-Aside)");
    return res.json(JSON.parse(cached));
  }

  console.log("Cache miss (Cache-Aside), fetching from MongoDB...");
  const record = await lake.findOne({ sensorId });

  if (record) {
    await redisClient.set(sensorId, JSON.stringify(record));
  }

  console.timeEnd("Cache-Aside Time");
  res.json(record || { message: "Sensor not found" });
});

// 2. Read-Through Strategy
app.get("/read-through/:id", async (req, res) => {
  const sensorId = req.params.id;
  console.time("Read-Through Time");

  let cached = await redisClient.get(sensorId);
  if (!cached) {
    console.log("Cache miss (Read-Through), loading from MongoDB...");
    const record = await lake.findOne({ sensorId });
    if (record) {
      await redisClient.set(sensorId, JSON.stringify(record));
      cached = JSON.stringify(record);
    }
  } else {
    console.log("Cache hit (Read-Through)");
  }

  console.timeEnd("Read-Through Time");
  res.json(cached ? JSON.parse(cached) : { message: "Sensor not found" });
});

// 3. Expiration-Based (TTL) Strategy
app.get("/cache-ttl/:id", async (req, res) => {
  const sensorId = req.params.id;
  console.time("TTL Cache Time");

  const cached = await redisClient.get(sensorId);
  if (cached) {
    console.timeEnd("TTL Cache Time");
    console.log("Cache hit (TTL)");
    return res.json(JSON.parse(cached));
  }

  console.log("Cache miss (TTL), fetching from MongoDB...");
  const record = await lake.findOne({ sensorId });

  if (record) {
    await redisClient.setEx(sensorId, 30, JSON.stringify(record));
  }

  console.timeEnd("TTL Cache Time");
  res.json(record || { message: "Sensor not found" });
});

// Server Start
app.get("/", (req, res) => {
  res.send("Lab 4: MongoDB + Redis Caching Strategies Ready");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
