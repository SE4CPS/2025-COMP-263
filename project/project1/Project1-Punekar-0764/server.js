require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "Project1";
const COLL_NAME = process.env.COLL_NAME || "Readings";

const client = new MongoClient(uri, { ignoreUndefined: true });

let col;
async function init() {
  await client.connect();
  const db = client.db(DB_NAME);
  col = db.collection(COLL_NAME);
  console.log("Connected to MongoDB:", DB_NAME, COLL_NAME);
}
init().catch((e) => {
  console.error("Mongo connect failed:", e);
  process.exit(1);
});

// tiny helper
const isNum = (x) => typeof x === "number" && !Number.isNaN(x);

// POST /readings → insert a new reading
app.post("/readings", async (req, res) => {
  try {
    const b = req.body;

    if (
      !b?.deviceId ||
      !b?.farmId ||
      !b?.sensor ||
      !isNum(b.sensor.tempC) ||
      !isNum(b.sensor.moisture) ||
      !isNum(b.sensor.humidity) ||
      !b?.gps ||
      !isNum(b.gps.lat) ||
      !isNum(b.gps.lon)
    ) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const doc = {
      deviceId: String(b.deviceId),
      farmId: String(b.farmId),
      sensor: {
        tempC: b.sensor.tempC,
        moisture: b.sensor.moisture,
        humidity: b.sensor.humidity,
      },
      gps: { lat: b.gps.lat, lon: b.gps.lon },
      note: b.note ? String(b.note) : "",
      timestamp: b.timestamp ? String(b.timestamp) : new Date().toISOString(),
      ingestedAt: new Date(),
      author: b.author ? String(b.author) : null,

    };

    const r = await col.insertOne(doc);
    res.status(201).json({ ok: true, id: r.insertedId, doc });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Insert failed" });
  }
});


app.get("/readings", async (req, res) => {
  try {
    const { since, limit } = req.query;
    const q = {};
    if (since) q.timestamp = { $gte: String(since) }; // ISO string compares lexicographically by time
    const lim = Math.min(parseInt(limit || "10", 10), 500);

    const docs = await col
      .find(q)
      .sort({ timestamp: -1 }) // latest first
      .limit(lim)
      .toArray();

    res.json({ count: docs.length, items: docs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Query failed" });
  }
});


app.get("/stats/basic", async (req, res) => {
  try {
    const { farmId } = req.query;
    const pipeline = [];

    if (farmId) pipeline.push({ $match: { farmId: String(farmId) } });

    pipeline.push({
      $group: {
        _id: null,
        count: { $sum: 1 },
        avgTempC: { $avg: "$sensor.tempC" },
        avgMoisture: { $avg: "$sensor.moisture" },
        avgHumidity: { $avg: "$sensor.humidity" },
        lastTimestamp: { $max: "$timestamp" },   // ISO string max = latest
        lastIngestedAt: { $max: "$ingestedAt" },
      },
    });

    const out = await col.aggregate(pipeline).toArray();
    res.json(out[0] || { count: 0, avgTempC: null, avgMoisture: null, avgHumidity: null, lastTimestamp: null, lastIngestedAt: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Stats failed" });
  }
});

app.get("/", (req, res) => {
  res.send("Server is running. Try /readings or /stats/basic");
});
const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
