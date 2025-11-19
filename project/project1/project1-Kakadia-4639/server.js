require("dotenv").config(); // Load .env variables

const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");

const app = express();

// --- Configuration from .env ---
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = process.env.COLLECTION_NAME;

app.use(cors());
app.use(express.json());

let collection;

// --- Connect to MongoDB ---
async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    collection = db.collection(COLLECTION_NAME);
    console.log(`Connected to MongoDB database: ${DB_NAME}`);
  } catch (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
}
connectDB();

// --- POST /readings ---
app.post("/readings", async (req, res) => {
  try {
    if (!collection) return res.status(503).send("Database not initialized");

    const doc = req.body;
    if (!doc.deviceId || !doc.farmId || !doc.sensor) {
      return res.status(400).send("Missing required fields");
    }

    doc.ingestedAt = new Date().toISOString();
    const result = await collection.insertOne(doc);
    res.status(201).json({ message: "Reading inserted", id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error inserting reading");
  }
});

// --- GET /readings?since=…&limit=… ---
app.get("/readings", async (req, res) => {
  try {
    if (!collection) return res.status(503).send("Database not initialized");

    const { since, limit } = req.query;
    const query = since ? { timestamp: { $gte: new Date(since).toISOString() } } : {};

    const cursor = collection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit) || 10);

    const results = await cursor.toArray();
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching readings");
  }
});

// --- GET /stats/basic?farmId=… ---
app.get("/stats/basic", async (req, res) => {
  try {
    if (!collection) return res.status(503).send("Database not initialized");

    const { farmId } = req.query;
    if (!farmId) return res.status(400).send("Missing farmId");

    const pipeline = [
      { $match: { farmId } },
      {
        $group: {
          _id: "$farmId",
          count: { $sum: 1 },
          avgTemp: { $avg: "$sensor.tempC" },
          avgMoisture: { $avg: "$sensor.moisture" },
          avgHumidity: { $avg: "$sensor.humidity" },
          lastReading: { $max: "$timestamp" }
        }
      }
    ];

    const [stats] = await collection.aggregate(pipeline).toArray();
    if (!stats) return res.status(404).send("No readings found for this farm");

    res.json({
      farmId,
      count: stats.count,
      avgTemp: stats.avgTemp.toFixed(2),
      avgMoisture: stats.avgMoisture.toFixed(2),
      avgHumidity: stats.avgHumidity.toFixed(2),
      lastReading: stats.lastReading
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error calculating statistics");
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
