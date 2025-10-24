import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(".")); // so reading.html works

// MongoDB setup
const MONGO_URI = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const DB_NAME = "Project1";
const COLLECTION_NAME = "Readings";

const client = new MongoClient(MONGO_URI);
await client.connect();
console.log("✅ Connected to MongoDB Atlas");

const db = client.db(DB_NAME);
const readings = db.collection(COLLECTION_NAME);

// ------------------------------------------------
// 1️⃣ POST /readings → Insert a new reading
// ------------------------------------------------
app.post("/readings", async (req, res) => {
  try {
    const data = req.body;
    data.timestamp = new Date().toISOString();
    data.ingestedAt = new Date().toISOString();

    const result = await readings.insertOne(data);
    res.status(201).json({ message: "✅ Reading inserted", insertedId: result.insertedId });
  } catch (err) {
    console.error("❌ Error inserting reading:", err);
    res.status(500).json({ error: "Failed to insert reading" });
  }
});

// ------------------------------------------------
// 2️⃣ GET /readings?since=...&limit=... → Query recent readings
// ------------------------------------------------
app.get("/readings", async (req, res) => {
  try {
    const { since, limit } = req.query;

    const query = {};
    if (since) query.timestamp = { $gte: new Date(since).toISOString() };

    const cursor = readings.find(query).sort({ timestamp: -1 });
    if (limit) cursor.limit(parseInt(limit));

    const results = await cursor.toArray();
    res.json(results);
  } catch (err) {
    console.error("❌ Error fetching readings:", err);
    res.status(500).json({ error: "Failed to fetch readings" });
  }
});

// ------------------------------------------------
// 3️⃣ GET /stats/basic?farmId=... → Aggregated stats per farm
// ------------------------------------------------
app.get("/stats/basic", async (req, res) => {
  try {
    const { farmId } = req.query;
    const match = farmId ? { farmId } : {};

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: "$farmId",
          count: { $sum: 1 },
          avgTemp: { $avg: "$sensor.tempC" },
          avgMoisture: { $avg: "$sensor.moisture" },
          avgHumidity: { $avg: "$sensor.humidity" },
          lastReading: { $max: "$timestamp" },
        },
      },
    ];

    const stats = await readings.aggregate(pipeline).toArray();
    res.json(stats.length ? stats[0] : { message: "No data found" });
  } catch (err) {
    console.error("❌ Error fetching stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ------------------------------------------------
// Start server
// ------------------------------------------------
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
