const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(express.json());

const uri =
  "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const client = new MongoClient(uri);

let db;
let readingsCollection;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("Project1");
    readingsCollection = db.collection("Readings");
    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
}

app.post("/readings", async (req, res) => {
  try {
    const newReading = {
      ...req.body,
      ingestedAt: new Date().toISOString(),
      author: "Ram Mallineni",
    };
    const result = await readingsCollection.insertOne(newReading);
    res.status(201).json({
      message: "Reading inserted successfully",
      id: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/readings", async (req, res) => {
  try {
    const since = req.query.since ? parseInt(req.query.since) : 30;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const sinceDate = new Date(Date.now() - since * 24 * 60 * 60 * 1000);

    const readings = await readingsCollection
      .find({
        timestamp: { $gte: sinceDate.toISOString() },
        author: "Ram Mallineni",
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    res.json({
      count: readings.length,
      readings,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/stats/basic", async (req, res) => {
  try {
    const farmId = req.query.farmId;

    const matchStage = { author: "Ram Mallineni" };
    if (farmId) {
      matchStage.farmId = farmId;
    }

    const stats = await readingsCollection
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalReadings: { $sum: 1 },
            avgTemp: { $avg: { $toDouble: "$sensor.tempC" } },
            avgMoisture: { $avg: { $toDouble: "$sensor.moisture" } },
            avgHumidity: { $avg: { $toDouble: "$sensor.humidity" } },
            lastReading: { $max: "$timestamp" },
          },
        },
      ])
      .toArray();

    if (stats.length > 0) {
      res.json(stats[0]);
    } else {
      res.json({ message: "No data found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
