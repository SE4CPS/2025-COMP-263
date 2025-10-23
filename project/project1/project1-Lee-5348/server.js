require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const app = express();
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);
const dbName = process.env.MONGO_DB || "Project1";
const collName = process.env.MONGO_COLLECTION || "Readings";

async function getCollection() {
  if (!client.topology?.isConnected()) await client.connect();
  return client.db(dbName).collection(collName);
}

app.post("/readings", async (req, res) => {
  const c = await getCollection();
  const doc = {
    deviceId: req.body.deviceId,
    farmId: req.body.farmId,
    sensor: req.body.sensor,
    gps: req.body.gps,
    note: req.body.note,
    timestamp: new Date().toISOString(),
    ingestedAt: new Date(),
  };
  const r = await c.insertOne(doc);
  res.status(201).json({ insertedId: r.insertedId });
});

app.get("/readings", async (req, res) => {
  const c = await getCollection();
  const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 86400000);
  const limit = parseInt(req.query.limit) || 10;
  const docs = await c.find({ ingestedAt: { $gte: since } }).sort({ ingestedAt: -1 }).limit(limit).toArray();
  res.json(docs);
});

app.get("/stats/basic", async (req, res) => {
  const c = await getCollection();
  const match = req.query.farmId ? { farmId: req.query.farmId } : {};
  const [s] = await c.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        avgTempC: { $avg: "$sensor.tempC" },
        avgMoisture: { $avg: "$sensor.moisture" },
        avgHumidity: { $avg: "$sensor.humidity" },
        last: { $max: "$ingestedAt" },
      },
    },
  ]).toArray();
  res.json(s || {});
});

app.listen(3000, () => console.log("API running on port 3000"));
