// server.js
const express = require("express");
const { MongoClient } = require("mongodb");
const bodyParser = require("body-parser");
const cors = require("cors");

// --- CONFIG ---
const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const dbName = "Project1";
const collectionName = "Readings";
const port = 3000;

// --- INIT ---
const app = express();
app.use(cors());
app.use(bodyParser.json());

let db, collection;

// --- CONNECT TO MONGODB ---
async function connectDB() {
  const client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  collection = db.collection(collectionName);
  console.log(`✅ Connected to MongoDB: ${dbName}.${collectionName}`);
}
connectDB().catch(console.error);

// ------------------------------------------------
// POST /readings  → Insert a new reading
// ------------------------------------------------
app.post("/readings", async (req, res) => {
  try {
    const reading = req.body;

    // Add automatic timestamps and createdBy field
    reading.ingestedAt = new Date().toISOString();
    reading.createdBy = "Anusha";

    const result = await collection.insertOne(reading);
    res.status(201).json({
      message: "✅ Reading inserted successfully",
      insertedId: result.insertedId,
    });
  } catch (err) {
    console.error("❌ Error inserting reading:", err);
    res.status(500).json({ error: "Failed to insert reading" });
  }
});

// ------------------------------------------------
// GET /readings?since=…&limit=…  → Query recent readings
// Example: /readings?since=2025-10-21T00:00:00Z&limit=10
// ------------------------------------------------
app.get("/readings", async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const limit = parseInt(req.query.limit) || 20;

    const readings = await collection
      .find({ timestamp: { $gte: since.toISOString() } })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    res.json(readings);
  } catch (err) {
    console.error("❌ Error fetching readings:", err);
    res.status(500).json({ error: "Failed to fetch readings" });
  }
});

// ------------------------------------------------
// GET /stats/basic?farmId=… → Return counts, averages, and last reading timestamp
// Example: /stats/basic?farmId=farm-01
// ------------------------------------------------
app.get("/stats/basic", async (req, res) => {
  try {
    const farmId = req.query.farmId;
    if (!farmId) {
      return res.status(400).json({ error: "farmId is required" });
    }

    const pipeline = [
      { $match: { farmId } },
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

    const stats = await collection.aggregate(pipeline).toArray();

    if (stats.length === 0) {
      return res.status(404).json({ message: "No readings found for given farmId" });
    }

    res.json(stats[0]);
  } catch (err) {
    console.error("❌ Error fetching stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ------------------------------------------------
// Start server
// ------------------------------------------------
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
