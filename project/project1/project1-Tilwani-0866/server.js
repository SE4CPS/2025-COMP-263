require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const morgan = require("morgan");

const {
  MONGODB_URI,
  PORT = 3000,
  DB_NAME = "Project1",
  COLL_NAME = "Readings",
} = process.env;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in .env");
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

let client, db, readings;

async function connect() {
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  readings = db.collection(COLL_NAME);
  await readings.createIndex({ ingestedAt: -1 });
  await readings.createIndex({ farmId: 1, "sensor.tempC": 1 });
  await readings.createIndex({ deviceId: 1, timestamp: -1 });
  console.log(`Connected → ${DB_NAME}.${COLL_NAME}`);
}

function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

app.post("/readings", async (req, res) => {
  try {
    const body = req.body || {};
    const required = ["deviceId", "farmId", "sensor", "gps"];
    for (const f of required) {
      if (!(f in body)) return res.status(400).json({ error: `Missing field: ${f}` });
    }
    const doc = {
      deviceId: String(body.deviceId),
      farmId: String(body.farmId),
      sensor: {
        tempC: Number(body.sensor.tempC),
        moisture: Number(body.sensor.moisture),
        humidity: Number(body.sensor.humidity),
      },
      gps: {
        lat: Number(body.gps.lat),
        lon: Number(body.gps.lon),
      },
      note: body.note ? String(body.note) : "api insert",
      timestamp: body.timestamp ? String(body.timestamp) : new Date().toISOString(),
      createdBy: body.createdBy || "Rohan Jagdish Tilwani",
      runId: body.runId || `api-${Date.now()}`,
      ingestedAt: new Date(),
    };
    const result = await readings.insertOne(doc);
    res.status(201).json({ insertedId: result.insertedId, doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to insert reading" });
  }
});

app.get("/readings", async (req, res) => {
  try {
    const { since, limit = 10, farmId, deviceId } = req.query;
    const q = {};
    if (farmId) q.farmId = String(farmId);
    if (deviceId) q.deviceId = String(deviceId);
    const sinceDate = toDateOrNull(since);
    if (sinceDate) q.ingestedAt = { $gte: sinceDate };
    const docs = await readings.find(q).sort({ ingestedAt: -1 }).limit(Number(limit)).toArray();
    res.json({ count: docs.length, query: q, data: docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch readings" });
  }
});

app.get("/stats/basic", async (req, res) => {
  try {
    const { farmId, deviceId, since } = req.query;
    if (!farmId) return res.status(400).json({ error: "farmId is required" });
    const sinceDate = toDateOrNull(since);
    const pipeline = [
      {
        $match: {
          farmId: String(farmId),
          ...(deviceId ? { deviceId: String(deviceId) } : {}),
          ...(sinceDate ? { ingestedAt: { $gte: sinceDate } } : {}),
        },
      },
      {
        $addFields: {
          ts: {
            $cond: [
              { $eq: [{ $type: "$timestamp" }, "date"] },
              "$timestamp",
              { $dateFromString: { dateString: "$timestamp" } },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgTempC: { $avg: "$sensor.tempC" },
          avgMoisture: { $avg: "$sensor.moisture" },
          avgHumidity: { $avg: "$sensor.humidity" },
          lastIngestedAt: { $max: "$ingestedAt" },
          lastTimestamp: { $max: "$ts" },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          averages: {
            tempC: { $round: ["$avgTempC", 2] },
            moisture: { $round: ["$avgMoisture", 2] },
            humidity: { $round: ["$avgHumidity", 2] },
          },
          lastReading: {
            ingestedAt: "$lastIngestedAt",
            timestamp: "$lastTimestamp",
          },
        },
      },
    ];
    const [stats = { total: 0, averages: {}, lastReading: {} }] = await readings.aggregate(pipeline).toArray();
    res.json({
      scope: { farmId, ...(deviceId ? { deviceId } : {}), ...(since ? { since } : {}) },
      stats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to compute stats" });
  }
});

connect()
  .then(() => app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)))
  .catch((e) => {
    console.error("Startup failure:", e);
    process.exit(1);
  });
