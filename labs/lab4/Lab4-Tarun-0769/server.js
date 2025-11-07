require("dotenv").config();
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const { createClient } = require("redis");

const app = express();
const PORT = process.env.PORT || 3000;

const mongoClient = new MongoClient(process.env.MONGODB_URI);
const redisClient = createClient({ url: process.env.REDIS_URL });
const TTL = Number(process.env.DEFAULT_TTL_SECONDS || 15);

async function start() {
  try {
    await mongoClient.connect();
    await redisClient.connect();
    console.log("Connected to MongoDB and Redis");

    const db = mongoClient.db(process.env.MONGODB_DB);
    const readings = db.collection(process.env.MONGODB_COLLECTION);

    // Health check endpoint
    app.get("/health", async (req, res) => {
      try {
        await redisClient.ping();
        res.json({ 
          ok: true, 
          message: "Services are healthy",
          author: process.env.AUTHOR 
        });
      } catch (error) {
        res.status(503).json({ ok: false, error: error.message });
      }
    });

    // 1. Cache-Aside Pattern
    // Application is responsible for loading data into cache
    app.get("/cache-aside/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const cacheKey = `reading:${id}`;

        // Check cache first
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return res.json({ 
            source: "redis", 
            pattern: "cache-aside",
            data: JSON.parse(cached) 
          });
        }

        // Cache miss - fetch from database
        const doc = await readings.findOne({ _id: new ObjectId(id) });
        if (!doc) {
          return res.status(404).json({ error: "not found" });
        }

        // Manually populate cache
        await redisClient.set(cacheKey, JSON.stringify(doc));
        return res.json({ 
          source: "mongo", 
          pattern: "cache-aside",
          data: doc 
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 2. Read-Through Pattern
    // Cache layer handles loading data (similar implementation for demonstration)
    app.get("/read-through/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const cacheKey = `rt:reading:${id}`;

        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return res.json({ 
            source: "redis", 
            pattern: "read-through",
            data: JSON.parse(cached) 
          });
        }

        const doc = await readings.findOne({ _id: new ObjectId(id) });
        if (!doc) {
          return res.status(404).json({ error: "not found" });
        }

        await redisClient.set(cacheKey, JSON.stringify(doc));
        return res.json({ 
          source: "mongo", 
          pattern: "read-through",
          data: doc 
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 3. TTL (Time-To-Live) Caching Pattern
    // Cache entries expire after a specified time
    app.get("/ttl/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const cacheKey = `ttl:reading:${id}`;

        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return res.json({ 
            source: "redis (not expired)", 
            pattern: "ttl-caching",
            data: JSON.parse(cached) 
          });
        }

        const doc = await readings.findOne({ _id: new ObjectId(id) });
        if (!doc) {
          return res.status(404).json({ error: "not found" });
        }

        // Set cache with expiration time
        await redisClient.set(cacheKey, JSON.stringify(doc), { EX: TTL });
        return res.json({
          source: "mongo (cached with ttl)",
          pattern: "ttl-caching",
          ttlSeconds: TTL,
          data: doc
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Cache invalidation endpoint
    app.delete("/cache/:pattern/:id", async (req, res) => {
      try {
        const { pattern, id } = req.params;
        let cacheKey;
        
        switch(pattern) {
          case 'cache-aside':
            cacheKey = `reading:${id}`;
            break;
          case 'read-through':
            cacheKey = `rt:reading:${id}`;
            break;
          case 'ttl':
            cacheKey = `ttl:reading:${id}`;
            break;
          default:
            return res.status(400).json({ error: "Invalid pattern" });
        }

        await redisClient.del(cacheKey);
        res.json({ message: "Cache invalidated", key: cacheKey });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Author: ${process.env.AUTHOR}`);
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await redisClient.quit();
  await mongoClient.close();
  process.exit(0);
});

start().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});