require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');

const app = express();

mongoose.connect(process.env.MONGODB_URI, { dbName: 'AgriDB' })
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.log("❌ MongoDB Connection Error:", err));

const redisClient = redis.createClient();
redisClient.connect()
  .then(() => console.log("✅ Redis Connected Successfully"))
  .catch(err => console.log("❌ Redis Connection Error:", err));

async function getSensorFromDB(sensorId) {
  const db = mongoose.connection.db;
  const collection = db.collection('readings');
  return await collection.findOne({ sensorId });
}

app.get('/', (req, res) => {
  res.send('MongoDB + Redis Caching Lab - Server Running!');
});

app.get('/no-cache/:sensorId', async (req, res) => {
  const { sensorId } = req.params;
  const startTime = Date.now();

  try {
    const dbData = await getSensorFromDB(sensorId);
    
    if (!dbData) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    const elapsed = Date.now() - startTime;
    res.json({
      strategy: 'No Cache (Direct MongoDB)',
      source: 'database',
      responseTime: `${elapsed}ms`,
      data: dbData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/cache-aside/:sensorId', async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `cache-aside:${sensorId}`;
  const startTime = Date.now();

  try {
    let cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      const elapsed = Date.now() - startTime;
      return res.json({
        strategy: 'Cache-Aside',
        source: 'cache',
        responseTime: `${elapsed}ms`,
        data: JSON.parse(cachedData)
      });
    }

    const dbData = await getSensorFromDB(sensorId);
    
    if (!dbData) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    await redisClient.set(cacheKey, JSON.stringify(dbData));
    
    const elapsed = Date.now() - startTime;
    res.json({
      strategy: 'Cache-Aside',
      source: 'database',
      responseTime: `${elapsed}ms`,
      data: dbData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/read-through/:sensorId', async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `read-through:${sensorId}`;
  const startTime = Date.now();

  try {
    const readThroughCache = async (key) => {
      let cachedData = await redisClient.get(key);
      
      if (cachedData) {
        return { source: 'cache', data: JSON.parse(cachedData) };
      }

      const dbData = await getSensorFromDB(sensorId);
      
      if (dbData) {
        await redisClient.set(key, JSON.stringify(dbData));
      }
      
      return { source: 'database', data: dbData };
    };

    const result = await readThroughCache(cacheKey);
    
    if (!result.data) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    const elapsed = Date.now() - startTime;
    res.json({
      strategy: 'Read-Through',
      source: result.source,
      responseTime: `${elapsed}ms`,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/ttl/:sensorId', async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `ttl:${sensorId}`;
  const startTime = Date.now();
  const TTL_SECONDS = 30;

  try {
    let cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      const ttl = await redisClient.ttl(cacheKey);
      const elapsed = Date.now() - startTime;
      
      return res.json({
        strategy: 'Expiration-Based (TTL)',
        source: 'cache',
        responseTime: `${elapsed}ms`,
        ttlRemaining: `${ttl} seconds`,
        data: JSON.parse(cachedData)
      });
    }

    const dbData = await getSensorFromDB(sensorId);
    
    if (!dbData) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    await redisClient.setEx(cacheKey, TTL_SECONDS, JSON.stringify(dbData));
    
    const elapsed = Date.now() - startTime;
    res.json({
      strategy: 'Expiration-Based (TTL)',
      source: 'database',
      responseTime: `${elapsed}ms`,
      ttlSet: `${TTL_SECONDS} seconds`,
      data: dbData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/clear-cache', async (req, res) => {
  try {
    await redisClient.flushAll();
    res.json({ message: 'All cache cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
