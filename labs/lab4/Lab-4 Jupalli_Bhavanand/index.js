require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const redis = require("redis");

const app = express();
const port = 3000;

// MongoDB connection
const mongoClient = new MongoClient(process.env.MONGODB_URI);

// Redis connection
const redisClient = redis.createClient({ url: process.env.REDIS_URI });

async function connectDBs() {
    try {
        await mongoClient.connect();
        console.log("Connected to MongoDB");

        await redisClient.connect();
        console.log("Connected to Redis");

        // Test Redis ping
        const pong = await redisClient.ping();
        console.log("Redis ping:", pong);

        // Optional: test MongoDB
        const db = mongoClient.db("AgriDB");
        const collection = db.collection("readings");
        const count = await collection.countDocuments();
        console.log("Number of documents in readings collection:", count);

    } catch (err) {
        console.error(err);
    }
}

connectDBs();

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
