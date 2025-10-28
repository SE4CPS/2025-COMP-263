const express = require("express");
const { MongoClient } = require("mongodb");
const app = express();
app.use(express.json());

const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const client = new MongoClient(uri);
let collection;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("Project1");
    collection = db.collection("Readings");
    console.log("Connected to MongoDB Atlas");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}
connectDB();

app.post("/readings", async (req, res) => {
  try {
    const newReading = {
      ...req.body,
      timestamp: new Date().toISOString(),
      ingestedAt: new Date().toISOString(),
    };
    const result = await collection.insertOne(newReading);
    res.status(201).json({ message: "Reading inserted", id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: "Failed to insert reading" });
  }
});

app.get("/readings", async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const limit = parseInt(req.query.limit) || 10;
    const readings = await collection
      .find({ timestamp: { $gte: since.toISOString() } })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    res.json(readings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch readings" });
  }
});

app.get("/stats/basic", async (req, res) => {
  try {
    const farmId = req.query.farmId;
    if (!farmId) return res.status(400).json({ error: "Missing farmId parameter" });

    const stats = await collection
      .aggregate([
        { $match: { farmId: farmId } },
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
      ])
      .toArray();

    res.json(stats[0] || { message: "No data for this farmId" });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));