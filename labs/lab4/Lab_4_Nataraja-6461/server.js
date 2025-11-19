// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

// Environment variables
const {
  REDIS_URL = 'redis://localhost:6379',
  MONGODB_URI,
  DB_NAME = 'AgriDB',
  COLLECTION = 'readings',
  PORT = 3000,
} = process.env;

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in .env');
  process.exit(1);
}

let mongoClient;
let redisClient;
let readingsCollection;

// -----------------------------------------------------
// Connect to MongoDB
// -----------------------------------------------------
async function connectMongo() {
  mongoClient = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await mongoClient.connect();
  const db = mongoClient.db(DB_NAME);
  readingsCollection = db.collection(COLLECTION);
  await db.command({ ping: 1 });
  console.log(`✅ MongoDB connected → db: ${DB_NAME}, collection: ${COLLECTION}`);
}

// -----------------------------------------------------
// Connect to Redis
// -----------------------------------------------------
async function connectRedis() {
  redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', (err) => console.error('Redis error:', err));
  await redisClient.connect();
  const pong = await redisClient.ping();
  console.log(`✅ Redis connected → PING => ${pong}`);
}

// -----------------------------------------------------
// Health check route
// -----------------------------------------------------
app.get('/health', async (_req, res) => {
  try {
    const pong = await redisClient.ping();
    await mongoClient.db(DB_NAME).command({ ping: 1 });
    res.json({
      ok: true,
      redis: pong,
      mongo: 'connected',
      db: DB_NAME,
      collection: COLLECTION,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// -----------------------------------------------------
// Insert new reading
// -----------------------------------------------------
app.post('/readings', async (req, res) => {
  try {
    const doc = {
      ...req.body,
      _ingestedAt: new Date().toISOString(),
      _source: 'lab4-node',
    };
    const result = await readingsCollection.insertOne(doc);
    await redisClient.set('lastReadingId', String(result.insertedId));
    res.status(201).json({ insertedId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------
// Basic retrieval
// -----------------------------------------------------
app.get('/readings', async (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 5);
    const items = await readingsCollection
      .find({})
      .sort({ _id: -1 })
      .limit(limit)
      .toArray();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// CACHE-ASIDE pattern
// =====================================================
app.get('/cache-aside/:sensorId', async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `sensor:${sensorId}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`Cache-Aside HIT → ${cacheKey}`);
      return res.json({ source: 'cache', data: JSON.parse(cached) });
    }

    console.log(`Cache-Aside MISS → ${cacheKey}`);
    const record = await readingsCollection.findOne({ sensorId });
    if (record) {
      await redisClient.set(cacheKey, JSON.stringify(record));
      return res.json({ source: 'database', data: record });
    }
    res.status(404).json({ error: 'Sensor not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// READ-THROUGH pattern
// =====================================================
async function readThrough(sensorId) {
  const cacheKey = `read:${sensorId}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    console.log(`Read-Through HIT → ${cacheKey}`);
    return JSON.parse(cached);
  }
  console.log(`Read-Through MISS → ${cacheKey}`);
  const record = await readingsCollection.findOne({ sensorId });
  if (record) await redisClient.set(cacheKey, JSON.stringify(record));
  return record;
}

app.get('/read-through/:sensorId', async (req, res) => {
  try {
    const record = await readThrough(req.params.sensorId);
    if (!record) return res.status(404).json({ error: 'Sensor not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// EXPIRATION-BASED (TTL) pattern
// =====================================================
app.get('/ttl/:sensorId', async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `ttl:${sensorId}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`TTL HIT → ${cacheKey}`);
      return res.json({ source: 'cache', data: JSON.parse(cached) });
    }

    console.log(`TTL MISS → ${cacheKey}`);

    const record = await readingsCollection.findOne({ sensorId });
    if (record) {
      await redisClient.set(cacheKey, JSON.stringify(record), { EX: 10 });
      return res.json({ source: 'database', data: record });
    }
    res.status(404).json({ error: 'Sensor not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------
// Start server
// -----------------------------------------------------
async function start() {
  try {
    await connectRedis();
    await connectMongo();
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log('Endpoints: /cache-aside/:id, /read-through/:id, /ttl/:id');
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

start();
