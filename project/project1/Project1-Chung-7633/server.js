import express from "express";
import { MongoClient } from "mongodb";

const app = express();
app.use(express.json());

const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const client = new MongoClient(uri);
const dbName = "Project1";

async function connectDB() {
  await client.connect();
  console.log("Connected to MongoDB Atlas");
  return client.db(dbName);
}

app.post("/readings", async (req, res) => {
  try {
    const db = await connectDB();
    const readings = db.collection("Readings");
    const reading = req.body;

    reading.timestamp = new Date().toISOString();
    reading.ingestedAt = new Date().toISOString();

    const result = await readings.insertOne(reading);
    res.status(201).json({ message: "Reading inserted", id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to insert reading" });
  }
});

app.get("/readings", async (req, res) => {
  try {
    const db = await connectDB();
    const readings = db.collection("Readings");

    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const limit = parseInt(req.query.limit) || 10;

    const docs = await readings
      .find({ timestamp: { $gte: since } })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch readings" });
  }
});

app.get("/stats/basic", async (req, res) => {
  try {
    const db = await connectDB();
    const readings = db.collection("Readings");
    const farmId = req.query.farmId;

    if (!farmId) return res.status(400).json({ error: "Missing farmId" });

    const stats = await readings
      .aggregate([
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
      ])
      .toArray();

    res.json(stats[0] || { message: "No data found for this farm" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));