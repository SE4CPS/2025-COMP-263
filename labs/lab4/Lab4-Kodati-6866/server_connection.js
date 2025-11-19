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
        port: process.env.REDIS_PORT
    }
});

async function startServer() {
    try {
        // Connect to MongoDB
        const mongoClient = new MongoClient(mongoURI);
        await mongoClient.connect();
        console.log("Connected to MongoDB Atlas");

        const db = mongoClient.db("AgriDB");
        const readingsCollection = db.collection("readings");

        // Connect to Redis
        await redisClient.connect();
        console.log("Connected to Redis");

        // Simple test endpoint
        app.get("/", async (req, res) => {
            const pong = await redisClient.ping();
            res.send(`Redis says: ${pong}`);
        });

        app.listen(3000, () => console.log("Server running on port 3000"));
    } catch (err) {
        console.error("Error connecting:", err);
    }
}

startServer();
