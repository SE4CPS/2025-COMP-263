const express = require("express");
const mongoose = require("mongoose");
const { createClient } = require("redis");
require("dotenv").config();

const app = express();
app.use(express.json());

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// --- Redis Connection ---
const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});
redisClient.on("connect", () => console.log("✅ Connected to Redis"));
redisClient.on("error", (err) => console.error("❌ Redis error:", err));
redisClient.connect();

// --- Schema and Model ---
const readingSchema = new mongoose.Schema({
  sensorId: String,
  reading: Number,
  unit: String,
  updatedAt: Date,
  meta: { author: String }
});
const Reading = mongoose.model("Reading", readingSchema);

// --- Cache-Aside Strategy ---
app.get("/cache-aside/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  try {
    const cached = await redisClient.get(sensorId);
    if (cached) {
      return res.json({ source: "cache", data: JSON.parse(cached) });
    }

    const data = await Reading.findOne({ sensorId });
    if (!data) return res.status(404).send("Sensor not found");

    await redisClient.set(sensorId, JSON.stringify(data));
    res.json({ source: "database", data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Read-Through Strategy ---
app.get("/read-through/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  try {
    let data = await redisClient.get(sensorId);
    if (!data) {
      console.log("⏳ Cache miss: fetching from MongoDB...");
      data = await Reading.findOne({ sensorId });
      if (data) await redisClient.set(sensorId, JSON.stringify(data));
    }
    if (!data) return res.status(404).send("Sensor not found");
    res.json({ source: "read-through", data: JSON.parse(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Expiration-Based (TTL) Strategy ---
app.get("/ttl/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  try {
    const cached = await redisClient.get(sensorId);
    if (cached) {
      return res.json({ source: "cache", data: JSON.parse(cached) });
    }

    const data = await Reading.findOne({ sensorId });
    if (!data) return res.status(404).send("Sensor not found");

    await redisClient.setEx(sensorId, 30, JSON.stringify(data));
    res.json({ source: "database", data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Helper route to insert a test sensor ---
app.post("/insert", async (req, res) => {
  const test = new Reading({
    sensorId: "sensor-101",
    reading: 45.2,
    unit: "°C",
    updatedAt: new Date(),
    meta: { author: "Utkarsh Ajay Gawande" }
  });
  await test.save();
  res.json({ message: "✅ Test sensor inserted" });
});

app.listen(3000, () => console.log("🚀 Server running on port 3000"));
