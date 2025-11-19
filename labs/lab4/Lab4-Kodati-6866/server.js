require("dotenv").config();
const { MongoClient } = require("mongodb");
const redis = require("redis");

const mongoClient = new MongoClient(process.env.MONGODB_URI);
const redisClient = redis.createClient({ url: process.env.REDIS_URI });

async function main() {
    await mongoClient.connect();
    await redisClient.connect();

    const db = mongoClient.db("myDatabase");
    const collection = db.collection("myCollection");

    async function getDataCacheAside(key) {
        const cached = await redisClient.get(key);
        if (cached) return JSON.parse(cached);

        const data = await collection.findOne({ key });
        await redisClient.set(key, JSON.stringify(data), { EX: 5 }); // TTL 5 seconds
        return data;
    }

    async function getDataDirect(key) {
        return await collection.findOne({ key });
    }

    const key = "someKey";

    // --- Measure without cache ---
    let start = Date.now();
    await getDataDirect(key);
    let end = Date.now();
    console.log("Direct MongoDB response:", end - start, "ms");

    // --- Measure with cache-aside ---
    start = Date.now();
    await getDataCacheAside(key);
    end = Date.now();
    console.log("Cache-aside first fetch (miss):", end - start, "ms");

    start = Date.now();
    await getDataCacheAside(key);
    end = Date.now();
    console.log("Cache-aside second fetch (hit):", end - start, "ms");

    console.log("Waiting 6 seconds for TTL expiration...");
    await new Promise(r => setTimeout(r, 6000));

    start = Date.now();
    await getDataCacheAside(key);
    end = Date.now();
    console.log("Cache-aside after TTL reload:", end - start, "ms");

    await redisClient.quit();
    await mongoClient.close();
}

main().catch(console.error);
