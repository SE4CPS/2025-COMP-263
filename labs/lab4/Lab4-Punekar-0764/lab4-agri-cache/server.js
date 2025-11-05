import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectMongo } from "./db.js";
import { connectRedis, keyReading } from "./cache.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const TTL = Number(process.env.DEFAULT_TTL_SECONDS || 60);

let readings, redis;

app.get("/health", async (_req, res) => {
  try {
    const pong = await redis.ping();
    const count = await readings.countDocuments({}, { limit: 1 });
    res.json({ ok: true, redis: pong, mongodb: "ok", sampleCount: count });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Cache-Aside
app.get("/cache-aside/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  const k = keyReading(sensorId);
  const cache = await redis.get(k);
  if (cache) return res.json({ source: "cache", data: JSON.parse(cache) });

  const doc = await readings.findOne({ sensorId }, { sort: { updatedAt: -1 } });
  if (!doc) return res.status(404).json({ error: "not found" });

  await redis.setEx(k, TTL, JSON.stringify(doc));
  res.json({ source: "db", data: doc });
});

// Read-Through
async function readThroughGet(sensorId) {
  const k = keyReading(sensorId);
  const cached = await redis.get(k);
  if (cached) return { source: "cache", data: JSON.parse(cached) };

  const doc = await readings.findOne({ sensorId }, { sort: { updatedAt: -1 } });
  if (!doc) return null;

  await redis.setEx(k, TTL, JSON.stringify(doc));
  return { source: "db->cache", data: doc };
}
app.get("/read-through/:sensorId", async (req, res) => {
  const result = await readThroughGet(req.params.sensorId);
  if (!result) return res.status(404).json({ error: "not found" });
  res.json(result);
});

// TTL demo
app.get("/ttl/:sensorId", async (req, res) => {
  const { sensorId } = req.params;
  const k = keyReading(sensorId);
  let val = await redis.get(k);
  if (!val) {
    const doc = await readings.findOne({ sensorId }, { sort: { updatedAt: -1 } });
    if (!doc) return res.status(404).json({ error: "not found" });
    await redis.setEx(k, TTL, JSON.stringify(doc));
    val = JSON.stringify(doc);
  }
  const ttl = await redis.ttl(k);
  res.json({ key: k, ttlSeconds: ttl, data: JSON.parse(val) });
});

const port = process.env.PORT || 3000;
const start = async () => {
  const { readings: r } = await connectMongo();
  readings = r;
  redis = await connectRedis();
  app.listen(port, () => console.log(`Server http://localhost:${port}`));
};
start();
