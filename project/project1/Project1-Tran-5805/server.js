require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HOST = process.env.MONGO_HOST;
const USER = process.env.MONGO_USER;
const PASS = process.env.MONGO_PASS;
const DB_NAME = process.env.MONGO_DB;
const COLLECTION_NAME = "Readings";

const client = new MongoClient(`${HOST}?retryWrites=true&w=majority`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  auth: { username: USER, password: PASS },
  authSource: "admin"
});

let collection;

(async function connectDB() {
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    collection = db.collection(COLLECTION_NAME);
    await collection.createIndex({ timestamp: 1 });
    console.log(`Connected to ${DB_NAME}.${COLLECTION_NAME}`);
    app.listen(PORT, () => console.log(`API server running at http://localhost:${PORT}`));
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
})();


// POST /readings → Insert a new reading
app.post('/readings', async (req, res) => {
  try {
    const reading = {
      ...req.body,
      ingestedAt: new Date().toISOString()
    };
    const result = await collection.insertOne(reading);
    res.status(201).json({ insertedId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /readings?since=…&limit=…
app.get('/readings', async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since).toISOString() : null;
    const limit = parseInt(req.query.limit) || 10;

    const query = since ? { timestamp: { $gte: since } } : {};
    const readings = await collection.find(query).sort({ timestamp: -1 }).limit(limit).toArray();
    res.json(readings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /stats/basic?farmId=…
app.get('/stats/basic', async (req, res) => {
  try {
    const farmId = req.query.farmId;
    if (!farmId) return res.status(400).json({ error: "Missing farmId" });

    const pipeline = [
      { $match: { farmId } },
      {
        $group: {
          _id: "$farmId",
          count: { $sum: 1 },
          avgTemp: { $avg: "$sensor.tempC" },
          avgMoisture: { $avg: "$sensor.moisture" },
          avgHumidity: { $avg: "$sensor.humidity" },
          lastTimestamp: { $max: "$timestamp" }
        }
      }
    ];

    const stats = await collection.aggregate(pipeline).toArray();
    res.json(stats[0] || { farmId, count: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});