require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const { createClient } = require("redis");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const mongoURI = process.env.MONGODB_URI;
const redisClient = createClient({
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    },
});

// Helper function for cache key naming
const cacheKey = (strategy, sensorId, author) =>
    `${strategy}:${sensorId}:${author}`;

async function startServer() {
    try {
        // Connect MongoDB
        const mongoClient = new MongoClient(mongoURI);
        await mongoClient.connect();
        console.log("Connected to MongoDB Atlas");

        const db = mongoClient.db("AgriDB");
        const readings = db.collection("readings");

        // Connect Redis
        await redisClient.connect();
        console.log("Connected to Redis");

        // -------------------------
        //  Cache-Aside Strategy
        // -------------------------
        app.get("/cache-aside/:sensorId/:author", async (req, res) => {
            const { sensorId, author } = req.params;
            const key = cacheKey("cacheAside", sensorId, author);

            const cachedData = await redisClient.get(key);
            if (cachedData) {
                console.log("Cache hit (Cache-Aside)");
                return res.json({ source: "cache", data: JSON.parse(cachedData) });
            }

            console.log(" Cache miss (Cache-Aside). Fetching from MongoDB...");
            const data = await readings.findOne({
                sensorId,
                "meta.author": author,
            });

            if (data) await redisClient.set(key, JSON.stringify(data));

            res.json({ source: "database", data });
        });

        // -------------------------
        //  Read-Through Strategy
        // -------------------------
        app.get("/read-through/:sensorId/:author", async (req, res) => {
            const { sensorId, author } = req.params;
            const key = cacheKey("readThrough", sensorId, author);

            const result = await redisClient.get(key);

            if (result) {
                console.log(" Read-through cache hit");
                return res.json({ source: "cache", data: JSON.parse(result) });
            }

            console.log("Read-through cache miss. Reading from DB...");
            const data = await readings.findOne({
                sensorId,
                "meta.author": author,
            });

            if (data) await redisClient.set(key, JSON.stringify(data));

            res.json({ source: "database", data });
        });

        // -------------------------
        // Expiration (TTL) Strategy
        // -------------------------
        app.get("/ttl/:sensorId/:author", async (req, res) => {
            const { sensorId, author } = req.params;
            const key = cacheKey("ttl", sensorId, author);

            const cached = await redisClient.get(key);
            if (cached) {
                console.log("TTL cache hit!");
                return res.json({ source: "cache", data: JSON.parse(cached) });
            }

            console.log(" TTL cache miss. Fetching from MongoDB...");
            const data = await readings.findOne({
                sensorId,
                "meta.author": author,
            });

            if (data) {
                // Cache for 10 seconds
                await redisClient.setEx(key, 10, JSON.stringify(data));
            }

            res.json({ source: "database", data });
        });

        // -------------------------
        // Server Start
        // -------------------------
        const PORT = 3000;
        app.listen(PORT, () =>
            console.log(`Server running on http://localhost:${PORT}`)
        );
    } catch (err) {
        console.error("Error connecting:", err);
    }
}

startServer();
