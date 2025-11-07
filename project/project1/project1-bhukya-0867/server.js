// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const PORT = process.env.PORT || 3000;
const URI = process.env.MONGO_URI || "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const DB_NAME = process.env.DB_NAME || "Project1";
const COLL_NAME = process.env.COLL_NAME || "Readings";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

let client, db, col;

// --- connect once and prep indexes ---
async function init() {
  client = new MongoClient(URI);
  await client.connect();
  db = client.db(DB_NAME);
  col = db.collection(COLL_NAME);

  // helpful indexes for speed
  await col.createIndex({ timestamp: -1 });
  await col.createIndex({ farmId: 1, timestamp: -1 });

  console.log(`✅ Connected to ${DB_NAME}.${COLL_NAME}`);
}
init().catch((e) => {
  console.error("Mongo init error:", e);
  process.exit(1);
});

// --- health ---
app.get("/health", (_req, res) => res.json({ ok: true }));

// ----------------------------------------------------------
// POST /readings  -> insert a new reading
// ----------------------------------------------------------
app.post("/readings", async (req, res) => {
  try {
    const b = req.body || {};

    // minimal validation (don’t overcomplicate)
    const missing = [];
    if (!b.deviceId) missing.push("deviceId");
    if (!b.farmId) missing.push("farmId");
    if (!b.sensor || typeof b.sensor !== "object") missing.push("sensor");
    else {
      ["tempC", "moisture", "humidity"].forEach((k) => {
        if (b.sensor[k] === undefined) missing.push(`sensor.${k}`);
      });
    }
    if (!b.gps || typeof b.gps !== "object") missing.push("gps");
    else {
      ["lat", "lon"].forEach((k) => {
        if (b.gps[k] === undefined) missing.push(`gps.${k}`);
      });
    }
    if (!b.note) missing.push("note");

    if (missing.length) {
      return res.status(400).json({ error: "Missing fields", missing });
    }

    const nowIso = new Date().toISOString();
    const doc = {
      deviceId: b.deviceId,
      farmId: b.farmId,
      sensor: {
        tempC: Number(b.sensor.tempC),
        moisture: Number(b.sensor.moisture),
        humidity: Number(b.sensor.humidity),
      },
      gps: { lat: Number(b.gps.lat), lon: Number(b.gps.lon) },
      note: b.note,
      timestamp: b.timestamp || nowIso,   // keep ISO string for consistency
      ingestedAt: nowIso,
    };

    const r = await col.insertOne(doc);
    return res.status(201).json({ insertedId: r.insertedId, doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server_error" });
  }
});

// ----------------------------------------------------------
// GET /readings?since=...&limit=...
// since: ISO-8601 string; limit: int (default 25, max 500)
// ----------------------------------------------------------
app.get("/readings", async (req, res) => {
  try {
    const { since, limit } = req.query;
    const lim = Math.max(1, Math.min(parseInt(limit || "25", 10), 500));

    const filter = {};
    if (since) {
      // our timestamps are ISO strings; string compare works if ISO
      filter.timestamp = { $gt: since };
    }

    const docs = await col
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(lim)
      .toArray();

    return res.json({ count: docs.length, items: docs });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server_error" });
  }
});

// ----------------------------------------------------------
// GET /stats/basic?farmId=...
// returns: { farmId, count, avgTempC, avgMoisture, avgHumidity, lastTimestamp }
// ----------------------------------------------------------
app.get("/stats/basic", async (req, res) => {
  try {
    const { farmId } = req.query;
    if (!farmId) return res.status(400).json({ error: "farmId is required" });

    const [agg] = await col
      .aggregate([
        { $match: { farmId } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            avgTempC: { $avg: "$sensor.tempC" },
            avgMoisture: { $avg: "$sensor.moisture" },
            avgHumidity: { $avg: "$sensor.humidity" },
            lastTimestamp: { $max: "$timestamp" }, // ISO string max is latest
          },
        },
        { $project: { _id: 0 } },
      ])
      .toArray();

    return res.json({
      farmId,
      ...(agg || { count: 0, avgTempC: null, avgMoisture: null, avgHumidity: null, lastTimestamp: null }),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server_error" });
  }
});

app.listen(PORT, () => console.log(`🚀 API listening on http://localhost:${PORT}`));