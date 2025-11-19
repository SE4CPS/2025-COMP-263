const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");

// ---- CONFIG ----
const URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const DB_NAME = process.env.DB_NAME || "Project1";
const COLL_NAME = "Readings";
const PORT = process.env.PORT || 3000;

// ---- APP ----
const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

// ---- DB INIT (single shared client) ----
let col;
(async () => {
  const client = new MongoClient(URI, { appName: "COMP263-IoTAPI" });
  await client.connect();
  col = client.db(DB_NAME).collection(COLL_NAME);
  console.log(`[DB] Connected to ${DB_NAME}.${COLL_NAME}`);
})().catch((err) => {
  console.error("[DB] Connection failed:", err);
  process.exit(1);
});

// ---- Helpers ----
const isNumber = (x) => typeof x === "number" && Number.isFinite(x);
const isoNow = () => new Date().toISOString();

// Minimal validation for POST /readings body
function validateReading(body) {
  const errors = [];

  if (!body || typeof body !== "object") return ["Body must be JSON object"];

  if (typeof body.deviceId !== "string" || !body.deviceId.trim())
    errors.push("deviceId (string) is required");
  if (typeof body.farmId !== "string" || !body.farmId.trim())
    errors.push("farmId (string) is required");

  if (!body.sensor || typeof body.sensor !== "object")
    errors.push("sensor object is required");
  else {
    const { tempC, moisture, humidity } = body.sensor;
    if (!isNumber(tempC)) errors.push("sensor.tempC (number) is required");
    if (!isNumber(moisture)) errors.push("sensor.moisture (number) is required");
    if (!isNumber(humidity)) errors.push("sensor.humidity (number) is required");
  }

  if (!body.gps || typeof body.gps !== "object")
    errors.push("gps object is required");
  else {
    const { lat, lon } = body.gps;
    if (!isNumber(lat)) errors.push("gps.lat (number) is required");
    if (!isNumber(lon)) errors.push("gps.lon (number) is required");
  }

  if (typeof body.note !== "string") errors.push("note (string) is required");

  if (body.timestamp && isNaN(Date.parse(body.timestamp)))
    errors.push("timestamp must be ISO 8601 (UTC) if provided");

  return errors;
}

// ---- ENDPOINTS ----

// POST /readings → Insert a new reading
app.post("/readings", async (req, res) => {
  try {
    const errors = validateReading(req.body);
    if (errors.length) return res.status(400).json({ ok: false, errors });

    const reading = {
      deviceId: req.body.deviceId.trim(),
      farmId: req.body.farmId.trim(),
      sensor: {
        tempC: req.body.sensor.tempC,
        moisture: req.body.sensor.moisture,
        humidity: req.body.sensor.humidity,
      },
      gps: {
        lat: req.body.gps.lat,
        lon: req.body.gps.lon,
      },
      note: req.body.note,
      timestamp: req.body.timestamp
        ? new Date(req.body.timestamp).toISOString() // normalize
        : isoNow(),
      ingestedAt: isoNow(),
    };

    const result = await col.insertOne(reading);
    return res.status(201).json({ ok: true, id: result.insertedId, reading });
  } catch (err) {
    console.error("POST /readings error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// GET /readings?since=…&limit=…
app.get("/readings", async (req, res) => {
  try {
    const since = req.query.since
      ? new Date(req.query.since)
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // default: last 24h
    if (isNaN(since.getTime()))
      return res.status(400).json({ ok: false, error: "Invalid since" });

    const limit = Math.min(
      Math.max(parseInt(req.query.limit ?? "50", 10), 1),
      200
    );

    // Note: your seed stored timestamp as ISO strings; we compare strings lexicographically.
    const cursor = col
      .find({ timestamp: { $gte: since.toISOString() } })
      .sort({ timestamp: -1 })
      .limit(limit);

    const docs = await cursor.toArray();
    return res.json({ ok: true, count: docs.length, items: docs });
  } catch (err) {
    console.error("GET /readings error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// GET /stats/basic?farmId=…
app.get("/stats/basic", async (req, res) => {
  try {
    const { farmId } = req.query;
    if (!farmId) {
      return res
        .status(400)
        .json({ ok: false, error: "farmId query param is required" });
    }

    const pipeline = [
      { $match: { farmId: String(farmId) } },
      {
        // convert ISO string -> Date for lastReading
        $addFields: { tsDate: { $toDate: "$timestamp" } },
      },
      {
        $group: {
          _id: "$farmId",
          count: { $sum: 1 },
          avgTempC: { $avg: "$sensor.tempC" },
          avgMoisture: { $avg: "$sensor.moisture" },
          avgHumidity: { $avg: "$sensor.humidity" },
          lastReading: { $max: "$tsDate" },
        },
      },
      {
        $project: {
          _id: 0,
          farmId: "$_id",
          count: 1,
          averages: {
            tempC: { $round: ["$avgTempC", 3] },
            moisture: { $round: ["$avgMoisture", 3] },
            humidity: { $round: ["$avgHumidity", 3] },
          },
          lastReadingTimestamp: {
            $dateToString: { date: "$lastReading", format: "%Y-%m-%dT%H:%M:%S.%LZ" },
          },
        },
      },
    ];

    const [stats] = await col.aggregate(pipeline).toArray();
    return res.json({ ok: true, stats: stats ?? null });
  } catch (err) {
    console.error("GET /stats/basic error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ---- START ----
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});