const express = require("express");
const { MongoClient } = require("mongodb");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const client = new MongoClient(uri);

let readingsCollection;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("Project1");
    readingsCollection = db.collection("Readings");
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}

app.post("/readings", async (req, res) => {
  try {
    const reading = req.body;

    reading.ingestedAt = {
      time: new Date().toISOString(),
      author: reading.ingestedAt?.author || "Utkarsh Ajay Gawande",
    };

    const result = await readingsCollection.insertOne(reading);
    res.status(201).json({ message: "✅ Reading inserted", id: result.insertedId });
  } catch (err) {
    console.error("❌ Error inserting reading:", err);
    res.status(500).json({ error: "Failed to insert reading" });
  }
});

app.get("/readings", async (req, res) => {
  try {
    const { since, limit } = req.query;

    const filter = since ? { timestamp: { $gte: new Date(since).toISOString() } } : {};
    const limitValue = limit ? parseInt(limit) : 10;

    const docs = await readingsCollection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limitValue)
      .toArray();

    res.status(200).json(docs);
  } catch (err) {
    console.error("❌ Error fetching readings:", err);
    res.status(500).json({ error: "Failed to fetch readings" });
  }
});

app.get("/stats/basic", async (req, res) => {
  try {
    const { farmId } = req.query;

    if (!farmId) {
      return res.status(400).json({ error: "farmId parameter is required" });
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
          lastTimestamp: { $max: "$timestamp" },
        },
      },
    ];

    const stats = await readingsCollection.aggregate(pipeline).toArray();
    res.status(200).json(stats[0] || { message: "No readings found for this farmId" });
  } catch (err) {
    console.error("❌ Error fetching stats:", err);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  connectDB();
});
