// Redis Caching Patterns Implementation
// Database: AgriDB, Collection: readings

const express = require('express');
const redis = require('redis');
const { MongoClient, ObjectId } = require('mongodb');

// ============================================
// CONFIGURATION
// ============================================

const PORT = 3000;

// TODO: Update with your MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://i40:dbms2@cluster0.lixbqmp.mongodb.net/AgriDB?retryWrites=true&w=majority';

const DB_NAME = 'AgriDB';
const COLLECTION_NAME = 'readings';

// Redis Configuration
const REDIS_CONFIG = {
  host: 'localhost',
  port: 6379
};

// ============================================
// INITIALIZE EXPRESS APP
// ============================================

const app = express();
app.use(express.json());

let redisClient;
let mongoClient;
let collection;

// ============================================
// CONNECT TO DATABASES
// ============================================

async function connectDatabases() {
  // Connect to Redis
  console.log('📡 Connecting to Redis...');
  redisClient = redis.createClient(REDIS_CONFIG);
  
  redisClient.on('error', (err) => console.error('Redis Error:', err));
  
  await redisClient.connect();
  console.log('✅ Redis connected');

  // Connect to MongoDB
  console.log('📡 Connecting to MongoDB...');
  mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  
  const db = mongoClient.db(DB_NAME);
  collection = db.collection(COLLECTION_NAME);
  console.log('✅ MongoDB connected');
}

// ============================================
// PATTERN 1: CACHE-ASIDE (LAZY LOADING)
// ============================================

/**
 * Cache-Aside Pattern:
 * 1. Check cache first
 * 2. If miss, query database
 * 3. Store result in cache
 * 4. Return data
 */
app.get('/cache-aside/reading/:sensorId', async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `cache-aside:sensor:${sensorId}`;
  
  const startTime = Date.now();
  
  try {
    // STEP 1: Check cache first
    console.log(`\n🔍 [Cache-Aside] Checking cache for sensor ${sensorId}...`);
    const cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      // CACHE HIT
      const responseTime = Date.now() - startTime;
      console.log(`✅ [Cache-Aside] CACHE HIT! Returned in ${responseTime}ms`);
      
      return res.json({
        pattern: 'Cache-Aside',
        source: 'CACHE',
        responseTime: `${responseTime}ms`,
        sensorId: parseInt(sensorId),
        data: JSON.parse(cachedData),
        explanation: 'Data retrieved from Redis cache (fast)'
      });
    }
    
    // CACHE MISS
    console.log(`❌ [Cache-Aside] Cache miss - querying database...`);
    
    // STEP 2: Query database
    const dbData = await collection.findOne({ 
      sensorId: parseInt(sensorId) 
    });
    
    if (!dbData) {
      return res.status(404).json({ 
        error: 'Sensor not found',
        pattern: 'Cache-Aside'
      });
    }
    
    // STEP 3: Store in cache (manually)
    await redisClient.set(cacheKey, JSON.stringify(dbData), {
      EX: 300 // 5 minutes expiration
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ [Cache-Aside] Data cached and returned in ${responseTime}ms`);
    
    return res.json({
      pattern: 'Cache-Aside',
      source: 'DATABASE',
      responseTime: `${responseTime}ms`,
      sensorId: parseInt(sensorId),
      data: dbData,
      explanation: 'Data fetched from MongoDB and cached in Redis'
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PATTERN 2: READ-THROUGH CACHE
// ============================================

/**
 * Read-Through Pattern:
 * Application always reads through cache layer
 * Cache is responsible for loading data from DB on miss
 */

// Read-Through Cache Helper
async function readThroughCache(sensorId) {
  const cacheKey = `read-through:sensor:${sensorId}`;
  
  // Check cache
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    console.log(`✅ [Read-Through] Cache hit for sensor ${sensorId}`);
    return { data: JSON.parse(cached), source: 'CACHE' };
  }
  
  // Cache miss - fetch from database
  console.log(`❌ [Read-Through] Cache miss - fetching from DB...`);
  const dbData = await collection.findOne({ sensorId: parseInt(sensorId) });
  
  if (dbData) {
    // Automatically populate cache
    await redisClient.set(cacheKey, JSON.stringify(dbData), {
      EX: 300 // 5 minutes
    });
    console.log(`✅ [Read-Through] Data loaded and cached`);
  }
  
  return { data: dbData, source: 'DATABASE' };
}

app.get('/read-through/reading/:sensorId', async (req, res) => {
  const { sensorId } = req.params;
  const startTime = Date.now();
  
  try {
    console.log(`\n🔍 [Read-Through] Request for sensor ${sensorId}...`);
    
    // Application only interacts with cache layer
    const result = await readThroughCache(sensorId);
    
    if (!result.data) {
      return res.status(404).json({ 
        error: 'Sensor not found',
        pattern: 'Read-Through'
      });
    }
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ [Read-Through] Request completed in ${responseTime}ms`);
    
    return res.json({
      pattern: 'Read-Through',
      source: result.source,
      responseTime: `${responseTime}ms`,
      sensorId: parseInt(sensorId),
      data: result.data,
      explanation: result.source === 'CACHE' 
        ? 'Cache layer returned data directly from Redis'
        : 'Cache layer fetched from MongoDB and populated Redis'
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PATTERN 3: EXPIRATION-BASED (TTL) CACHE
// ============================================

/**
 * TTL-Based Pattern:
 * Cache entries automatically expire after set time
 * Different TTL for different data types
 */

app.get('/ttl/reading/:sensorId', async (req, res) => {
  const { sensorId } = req.params;
  const cacheKey = `ttl:sensor:${sensorId}`;
  const TTL_SECONDS = 30; // 30 seconds for demo
  
  const startTime = Date.now();
  
  try {
    console.log(`\n🔍 [TTL] Checking cache for sensor ${sensorId}...`);
    
    // Check cache
    const cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      // Get TTL remaining
      const ttl = await redisClient.ttl(cacheKey);
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ [TTL] Cache hit! TTL remaining: ${ttl} seconds`);
      
      return res.json({
        pattern: 'TTL-Based Expiration',
        source: 'CACHE',
        responseTime: `${responseTime}ms`,
        ttl_remaining: `${ttl} seconds`,
        sensorId: parseInt(sensorId),
        data: JSON.parse(cachedData),
        explanation: `Data from cache. Will auto-expire in ${ttl} seconds`
      });
    }
    
    // Cache miss or expired
    console.log(`❌ [TTL] Cache miss or expired - fetching from DB...`);
    
    const dbData = await collection.findOne({ 
      sensorId: parseInt(sensorId) 
    });
    
    if (!dbData) {
      return res.status(404).json({ 
        error: 'Sensor not found',
        pattern: 'TTL-Based'
      });
    }
    
    // Cache with TTL
    await redisClient.set(cacheKey, JSON.stringify(dbData), {
      EX: TTL_SECONDS
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ [TTL] Data cached with ${TTL_SECONDS}s TTL`);
    
    return res.json({
      pattern: 'TTL-Based Expiration',
      source: 'DATABASE',
      responseTime: `${responseTime}ms`,
      ttl_set: `${TTL_SECONDS} seconds`,
      sensorId: parseInt(sensorId),
      data: dbData,
      explanation: `Fresh data from DB. Cached for ${TTL_SECONDS} seconds`
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// UTILITY ENDPOINTS
// ============================================

// Clear all caches
app.delete('/cache/clear', async (req, res) => {
  try {
    await redisClient.flushAll();
    console.log('🗑️  All caches cleared');
    res.json({ message: 'All caches cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cache statistics
app.get('/cache/stats', async (req, res) => {
  try {
    const info = await redisClient.info();
    const dbSize = await redisClient.dbSize();
    
    res.json({
      cached_keys: dbSize,
      redis_info: info.split('\r\n').slice(0, 10).join('\n')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    // Check Redis
    const redisPing = await redisClient.ping();
    
    // Check MongoDB
    await mongoClient.db().admin().ping();
    
    res.json({
      status: 'healthy',
      redis: redisPing === 'PONG' ? 'connected' : 'disconnected',
      mongodb: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message 
    });
  }
});

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'Redis Caching Patterns Demo',
    patterns: {
      'cache-aside': 'GET /cache-aside/reading/:sensorId',
      'read-through': 'GET /read-through/reading/:sensorId',
      'ttl-based': 'GET /ttl/reading/:sensorId'
    },
    utilities: {
      'clear-cache': 'DELETE /cache/clear',
      'cache-stats': 'GET /cache/stats',
      'health': 'GET /health'
    },
    examples: [
      'curl http://localhost:3000/cache-aside/reading/1',
      'curl http://localhost:3000/read-through/reading/2',
      'curl http://localhost:3000/ttl/reading/3'
    ]
  });
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
  try {
    await connectDatabases();
    
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🚀 Redis Caching Patterns Server Running');
      console.log('='.repeat(60));
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log('\n📚 Available Endpoints:');
      console.log('   Cache-Aside:  GET  /cache-aside/reading/:sensorId');
      console.log('   Read-Through: GET  /read-through/reading/:sensorId');
      console.log('   TTL-Based:    GET  /ttl/reading/:sensorId');
      console.log('\n🛠️  Utilities:');
      console.log('   Clear Cache:  DELETE /cache/clear');
      console.log('   Cache Stats:  GET    /cache/stats');
      console.log('   Health Check: GET    /health');
      console.log('\n💡 Test with:');
      console.log('   curl http://localhost:3000/cache-aside/reading/1');
      console.log('='.repeat(60) + '\n');
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  await redisClient.quit();
  await mongoClient.close();
  process.exit(0);
});

startServer();