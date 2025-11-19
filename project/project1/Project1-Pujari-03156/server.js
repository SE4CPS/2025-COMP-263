import express from "express";
import { MongoClient } from "mongodb";
import morgan from "morgan";
import cors from "cors";

// ====== HARD-CODED SETTINGS ======
const MONGO_URI = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const DB_NAME = "Project1";
const COLLECTION = "Readings";
const AUTHOR = "Shradha Pujari";
const PORT = 3000;
// =================================

const client = new MongoClient(MONGO_URI, { maxPoolSize: 10 });
let db, col;

async function initDb() {
  if (!db) {
    await client.connect();
    db = client.db(DB_NAME);
    col = db.collection(COLLECTION);
    console.log("Connected to MongoDB Atlas");
  }
}

function isIsoUtcZ(s) {
  return typeof s === "string" && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(s);
}

function validateReading(body) {
  const errors = [];
  const { deviceId, farmId, sensor, gps, timestamp } = body || {};

  // required fields
  if (!deviceId) errors.push("deviceId is required");
  if (!farmId) errors.push("farmId is required");
  if (!sensor) errors.push("sensor is required");
  if (!gps) errors.push("gps is required");
  if (!timestamp) errors.push("timestamp is required");

  // timestamp format 'Z' (UTC)
  if (timestamp && !isIsoUtcZ(timestamp)) {
    errors.push("timestamp must be ISO-8601 UTC ending with 'Z' (e.g., 2025-10-24T20:30:00Z)");
  }

  // sensor subfields + numeric check
  if (sensor) {
    const { tempC, moisture, humidity } = sensor;
    if (tempC === undefined) errors.push("sensor.tempC is required");
    if (moisture === undefined) errors.push("sensor.moisture is required");
    if (humidity === undefined) errors.push("sensor.humidity is required");
    if (tempC !== undefined && Number.isNaN(Number(tempC))) errors.push("sensor.tempC must be a number");
    if (moisture !== undefined && Number.isNaN(Number(moisture))) errors.push("sensor.moisture must be a number");
    if (humidity !== undefined && Number.isNaN(Number(humidity))) errors.push("sensor.humidity must be a number");
  }

  // gps ranges
  if (gps) {
    const { lat, lon } = gps;
    if (lat === undefined) errors.push("gps.lat is required");
    if (lon === undefined) errors.push("gps.lon is required");
    const nlat = Number(lat), nlon = Number(lon);
    if (lat !== undefined && Number.isNaN(nlat)) errors.push("gps.lat must be a number");
    if (lon !== undefined && Number.isNaN(nlon)) errors.push("gps.lon must be a number");
    if (!Number.isNaN(nlat) && (nlat < -90 || nlat > 90)) errors.push("gps.lat must be between -90 and 90");
    if (!Number.isNaN(nlon) && (nlon < -180 || nlon > 180)) errors.push("gps.lon must be between -180 and 180");
  }

  return errors;
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Health
app.get("/health", async (_req, res) => {
  try {
    await initDb();
    await db.command({ ping: 1 });
    res.json({ status: "ok", author: AUTHOR });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

/**
 * Q3 — POST /readings → insert one reading
 * Body: { deviceId, farmId, sensor{tempC,moisture,humidity}, gps{lat,lon}, note?, timestamp(ISO-UTC 'Z') }
 * Q4 — Validation enforced above: required fields, GPS ranges, ISO-UTC timestamp
 */
app.post("/readings", async (req, res) => {
  try {
    await initDb();
    const errs = validateReading(req.body);
    if (errs.length) return res.status(400).json({ error: "Validation failed", details: errs });

    const { deviceId, farmId, sensor, gps, note = null, timestamp } = req.body;
    const doc = {
      author: AUTHOR,
      deviceId: String(deviceId),
      farmId: String(farmId),
      sensor: {
        tempC: Number(sensor.tempC),
        moisture: Number(sensor.moisture),
        humidity: Number(sensor.humidity)
      },
      gps: { lat: Number(gps.lat), lon: Number(gps.lon) },
      note,
      timestamp: new Date(timestamp),
      ingestedAt: new Date()
    };
    const result = await col.insertOne(doc);
    res.status(201).json({ insertedId: result.insertedId, doc });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Q3 — GET /readings?since=...&limit=...
 */
app.get("/readings", async (req, res) => {
  try {
    await initDb();
    const lim = Math.min(Number(req.query.limit) || 50, 200);
    const filter = { author: AUTHOR };
    if (req.query.since) {
      const d = new Date(req.query.since);
      if (isNaN(d.getTime())) return res.status(400).json({ error: "Invalid 'since' parameter" });
      filter.timestamp = { $gte: d };
    }
    const items = await col.find(filter).sort({ timestamp: -1 }).limit(lim).toArray();
    res.json({ author: AUTHOR, count: items.length, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Q3 — GET /stats/basic?farmId=...
 */
app.get("/readings/stats/basic", async (req, res) => {
  try {
    await initDb();
    const { farmId } = req.query;
    if (!farmId) return res.status(400).json({ error: "farmId is required" });

    const pipeline = [
      { $match: { author: AUTHOR, farmId: String(farmId) } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgTempC: { $avg: "$sensor.tempC" },
          avgMoisture: { $avg: "$sensor.moisture" },
          avgHumidity: { $avg: "$sensor.humidity" },
          lastTimestamp: { $max: "$timestamp" }
        }
      }
    ];
    const [stats] = await col.aggregate(pipeline).toArray();
    res.json({ author: AUTHOR, stats: stats || { count: 0 } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => console.log(`API for ${AUTHOR} at http://localhost:${PORT}`));
