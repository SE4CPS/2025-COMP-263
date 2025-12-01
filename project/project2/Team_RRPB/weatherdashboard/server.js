const express = require("express");
const cors = require("cors");
const { createClient } = require("redis");
require("dotenv").config();

const app = express();
app.use(cors());

const redis = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

redis.on("error", err => console.error("Redis Error:", err));

async function connectRedis() {
    await redis.connect();
    console.log("Redis Connected");
}
connectRedis();

app.get("/api/weather", async (req, res) => {
    try {
        // Get all weather:* keys
        const keys = await redis.keys("weather:*");

        const result = [];
        for (const key of keys) {
            const value = await redis.get(key);
            result.push({
                date: key.split(":")[1],
                ...JSON.parse(value)
            });
        }

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load weather data" });
    }
});

app.listen(4000, () => {
    console.log("Backend API running on http://localhost:4000");
});
