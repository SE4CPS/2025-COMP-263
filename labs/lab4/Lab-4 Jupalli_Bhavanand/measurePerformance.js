require("dotenv").config();
const { MongoClient } = require("mongodb");
const redis = require("redis");

const mongoClient = new MongoClient(process.env.MONGODB_URI);
const redisClient = redis.createClient({ url: process.env.REDIS_URI });

async function main() {
    await mongoClient.connect();
    await redisClient.connect();

    const db = mongoClient.db("AgriDB");
    const collection = db.collection("readings");

    const sensorId = "sensor_1";
    const author = "Lab4User";
    const cacheKey = `sensor:${sensorId}:author:${author}`;

    // --- Helper functions ---
    async function getDirect() {
        return await collection.findOne({ sensorId, "meta.author": author });
    }

    async function getCacheAside() {
        const cached = await redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const data = await collection.findOne({ sensorId, "meta.author": author });
        await redisClient.set(cacheKey, JSON.stringify(data), { EX: 5 }); // TTL 5s
        return data;
    }

    // --- Measure Direct MongoDB ---
    let start = Date.now();
    await getDirect();
    let end = Date.now();
    const directTime = end - start;
    console.log("Direct MongoDB response:", directTime, "ms");

    // --- Measure Cache-Aside first fetch (miss) ---
    start = Date.now();
    await getCacheAside();
    end = Date.now();
    const cacheMissTime = end - start;
    console.log("Cache-Aside first fetch (miss):", cacheMissTime, "ms");

    // --- Measure Cache-Aside second fetch (hit) ---
    start = Date.now();
    await getCacheAside();
    end = Date.now();
    const cacheHitTime = end - start;
    console.log("Cache-Aside second fetch (hit):", cacheHitTime, "ms");

    // --- Wait for TTL to expire ---
    console.log("Waiting 6 seconds for TTL expiration...");
    await new Promise(r => setTimeout(r, 6000));

    start = Date.now();
    await getCacheAside();
    end = Date.now();
    const ttlReloadTime = end - start;
    console.log("Cache-Aside after TTL reload:", ttlReloadTime, "ms");

    // --- Close connections ---
    await redisClient.quit();
    await mongoClient.close();

    // --- Table for assignment ---
    console.table([
        { Strategy: "Direct MongoDB", "Avg Response Time (ms)": directTime },
        { Strategy: "Cache-Aside (miss)", "Avg Response Time (ms)": cacheMissTime },
        { Strategy: "Cache-Aside (hit)", "Avg Response Time (ms)": cacheHitTime },
        { Strategy: "Cache-Aside after TTL reload", "Avg Response Time (ms)": ttlReloadTime },
    ]);
}

main().catch(console.error);
