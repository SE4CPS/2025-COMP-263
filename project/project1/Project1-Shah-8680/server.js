// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(bodyParser.json());

const MONGODB_URI = process.env.MONGODB_URI; // e.g. mongodb+srv://user:pass@cluster/Project1?retryWrites=true&w=majority
const DB_NAME = process.env.DB_NAME || 'Project1';
const COLLECTION = 'Readings';
if (!MONGODB_URI) {
  console.error('Set MONGODB_URI in .env');
  process.exit(1);
}

let db, readings;

async function initDb(){
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  readings = db.collection(COLLECTION);
  // ensure index on timestamp (text or TTL not requested) - create if not exists
  await readings.createIndex({ timestamp: 1 });
  console.log('Connected to MongoDB, DB:', DB_NAME);
}
initDb().catch(err => { console.error('DB init failed', err); process.exit(1); });

/**
 * POST /readings
 * Insert a reading document.
 * Expected JSON body: { deviceId, farmId, sensor: { tempC, moisture, humidity }, gps: { lat, lon }, note, timestamp, ingestedAt }
 * timestamp must be ISO string; ingestedAt typically server time but can be provided.
 */
app.post('/readings', async (req, res) => {
  try {
    const doc = req.body;

    // minimal validation
    if (!doc.deviceId || !doc.farmId || !doc.timestamp) {
      return res.status(400).json({ error: 'deviceId, farmId, and timestamp are required' });
    }
    // parse timestamp
    const ts = new Date(doc.timestamp);
    if (isNaN(ts.getTime())) {
      return res.status(400).json({ error: 'timestamp must be valid ISO date string' });
    }
    doc.timestamp = ts.toISOString();

    // ensure gps ranges roughly valid if provided
    if (doc.gps) {
      const { lat, lon } = doc.gps;
      if (typeof lat === 'number') {
        if (lat < -90 || lat > 90) return res.status(400).json({ error: 'gps.lat out of range' });
      }
      if (typeof lon === 'number') {
        if (lon < -180 || lon > 180) return res.status(400).json({ error: 'gps.lon out of range' });
      }
    }

    doc.ingestedAt = doc.ingestedAt || new Date().toISOString();

    const result = await readings.insertOne(doc);
    res.status(201).json({ insertedId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

/**
 * GET /readings?since=ISO&limit=NUMBER
 * Query recent readings. When since missing, return latest readings.
 */
app.get('/readings', async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : null;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 1000);

    const filter = {};
    if (since && !isNaN(since.getTime())) {
      filter.timestamp = { $gte: since.toISOString() };
    }
    // sort newest first
    const docs = await readings.find(filter).sort({ timestamp: -1 }).limit(limit).toArray();
    res.json({ count: docs.length, readings: docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

/**
 * GET /stats/basic?farmId=...
 * Returns: counts, averages (tempC, moisture, humidity), last reading timestamp
 */
app.get('/stats/basic', async (req, res) => {
  try {
    const farmId = req.query.farmId;
    if (!farmId) return res.status(400).json({ error: 'farmId required' });

    // aggregation pipeline
    const pipeline = [
      { $match: { farmId } },
      {
        $group: {
          _id: '$farmId',
          count: { $sum: 1 },
          avgTempC: { $avg: '$sensor.tempC' },
          avgMoisture: { $avg: '$sensor.moisture' },
          avgHumidity: { $avg: '$sensor.humidity' },
          lastTimestamp: { $max: '$timestamp' }
        }
      }
    ];

    const agg = await readings.aggregate(pipeline).toArray();
    if (agg.length === 0) return res.json({ farmId, count: 0 });

    const row = agg[0];
    res.json({
      farmId,
      count: row.count,
      averages: {
        tempC: row.avgTempC === null ? null : Number(row.avgTempC.toFixed(3)),
        moisture: row.avgMoisture === null ? null : Number(row.avgMoisture.toFixed(3)),
        humidity: row.avgHumidity === null ? null : Number(row.avgHumidity.toFixed(3))
      },
      lastTimestamp: row.lastTimestamp
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening ${PORT}`));
