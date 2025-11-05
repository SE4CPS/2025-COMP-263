import dotenv from 'dotenv';
import express from 'express';
import { redisClient, connectRedis, disconnectRedis } from './config/redis.js';
import { connectMongoDB, disconnectMongoDB, getCollection } from './config/mongodb.js';

dotenv.config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// ============================================
// PATTERN 1: CACHE-ASIDE (GET)
// Check cache first, then database, update cache on miss
// ============================================
app.get('/readings/:sensorId', async (req, res) => {
  try {
    const { sensorId } = req.params;
    const cacheKey = `sensor:${sensorId}`;

    // Check cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return res.json({ source: 'cache', data: JSON.parse(cached) });
    }

    // Cache miss - fetch from database
    console.log(`Cache MISS: ${cacheKey}, fetching from DB...`);
    const collection = getCollection();
    const data = await collection.findOne({ sensorId });

    if (data) {
      // Update cache with fetched data and TTL (expiration)
      const ttlSeconds = 30; // 5 minutes TTL
      await redisClient.setEx(cacheKey, ttlSeconds, JSON.stringify(data));
      console.log(`Data cached with TTL ${ttlSeconds}s: ${cacheKey}`);
      return res.json({ source: 'database', data });
    }

    res.status(404).json({ error: 'Reading not found' });
  } catch (error) {
    console.error('GET error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PATTERN 2: READ-THROUGH (GET with TTL)
// Always read through cache layer, cache handles DB fetch on miss
// ============================================
app.get('/readings/author/:author', async (req, res) => {
  try {
    const { author } = req.params;
    const cacheKey = `author:${author}`;
    const ttlSeconds = 60; // 60 seconds TTL

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return res.json({ source: 'cache', data: JSON.parse(cached) });
    }

    // Cache miss - cache layer fetches from DB
    console.log(`Cache MISS: ${cacheKey}, fetching from DB...`);
    const collection = getCollection();
    const data = await collection.findOne({ 'meta.author': author });

    if (data) {
      // Cache layer updates cache with TTL
      await redisClient.setEx(cacheKey, ttlSeconds, JSON.stringify(data));
      console.log(`Data cached with TTL ${ttlSeconds}s: ${cacheKey}`);
      return res.json({ source: 'database', data });
    }

    res.status(404).json({ error: 'Reading not found' });
  } catch (error) {
    console.error('GET error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PUT - Update existing reading (invalidate cache)
// ============================================
app.put('/readings/:sensorId', async (req, res) => {
  try {
    const { sensorId } = req.params;
    const updateData = req.body;
    const cacheKey = `sensor:${sensorId}`;

    const collection = getCollection();
    const result = await collection.findOneAndUpdate(
      { sensorId },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (result) {
      // Invalidate cache - delete from Redis
      await redisClient.del(cacheKey);
      console.log(`Cache invalidated: ${cacheKey}`);
      res.json({ message: 'Reading updated', data: result });
    } else {
      res.status(404).json({ error: 'Reading not found' });
    }
  } catch (error) {
    console.error('PUT error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST - Create new reading (with TTL cache)
// ============================================
app.post('/readings', async (req, res) => {
  try {
    const readingData = {
      ...req.body,
      updatedAt: new Date()
    };

    const collection = getCollection();
    const result = await collection.insertOne(readingData);

    if (result.insertedId) {
      const newReading = { ...readingData, _id: result.insertedId };
      
      // Cache the new reading with TTL
      const cacheKey = `sensor:${readingData.sensorId}`;
      const ttlSeconds = 30; 
      await redisClient.setEx(cacheKey, ttlSeconds, JSON.stringify(newReading));
      console.log(`New reading cached with TTL ${ttlSeconds}s: ${cacheKey}`);

      res.status(201).json({ message: 'Reading created', data: newReading });
    } else {
      res.status(500).json({ error: 'Failed to create reading' });
    }
  } catch (error) {
    console.error('POST error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET - Retrieve with TTL expiration check
// ============================================
app.get('/readings/ttl/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const cached = await redisClient.get(key);

    if (cached) {
      const ttl = await redisClient.ttl(key);
      console.log(`Retrieved: ${key} (TTL: ${ttl}s)`);
      return res.json({ source: 'cache', ttl: ttl, data: JSON.parse(cached) });
    }

    res.status(404).json({ error: 'Key not found or expired' });
  } catch (error) {
    console.error('GET TTL error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// Start Server
// ============================================
async function main() {
  try {
    console.log('Starting Lab 4 application...\n');

    // Connect to Redis
    await connectRedis();

    // Connect to MongoDB Atlas
    await connectMongoDB();

    console.log('\nAll connections established successfully!');
    console.log(' Redis: Connected and ready');
    console.log(' MongoDB Atlas: Connected to AgriDB.readings');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\nServer running on http://localhost:${PORT}`);
      console.log('\nAvailable endpoints:');
      console.log('  GET  /readings/:sensorId        - Cache-Aside pattern (5min TTL)');
      console.log('  GET  /readings/author/:author   - Read-Through pattern with TTL');
      console.log('  GET  /readings/ttl/:key          - Check TTL expiration');
      console.log('  GET  /readings/test-ttl/:sensorId - Test TTL expiration (10s TTL)');
      console.log('  PUT  /readings/:sensorId        - Update reading (invalidates cache)');
      console.log('  POST /readings                  - Create reading (caches with TTL)');
    });
  } catch (error) {
    console.error(' Application error:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  await disconnectRedis();
  await disconnectMongoDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\nShutting down gracefully...');
  await disconnectRedis();
  await disconnectMongoDB();
  process.exit(0);
});

// Run the application
main();
