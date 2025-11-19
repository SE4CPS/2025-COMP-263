require("dotenv").config();
const { MongoClient } = require("mongodb");
const express = require("express");
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// MongoDB
const uri = process.env.MONGO_URI; // same as insertReadings.js
const dbName = "Project1";
const collectionName = "Readings";

const client = new MongoClient(uri);

async function connectDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (err) {
        console.error("Error connecting to MongoDB:", err);
    }
}
connectDB();

// POST /readings → insert one reading
app.post("/readings", async (req, res) => {
    try {
        const reading = req.body;
        const db = client.db(dbName);
        const coll = db.collection(collectionName);

        await coll.insertOne(reading);
        res.status(200).send("Reading added successfully");
    } catch (err) {
        console.error("Error inserting reading:", err);
        res.status(500).send("Error inserting reading");
    }
});

// GET /readings → query recent readings
app.get("/readings", async (req, res) => {
    try {
        const db = client.db(dbName);
        const coll = db.collection(collectionName);

        const { since, limit } = req.query;
        const query = {};

        if (since) {
            const sinceDate = new Date(since).toISOString(); // convert to string for comparison
            if (!isNaN(new Date(since))) query.timestamp = { $gte: sinceDate };
        }

        const readings = await coll
            .find(query)
            .sort({ timestamp: -1 })   // newest first
            .limit(Number(limit) || 10)
            .toArray();

        res.status(200).json(readings);
    } catch (err) {
        console.error("Error fetching readings:", err);
        res.status(500).send("Error fetching readings");
    }
});

// GET /stats/basic → return counts, averages, last reading timestamp
app.get("/stats/basic", async (req, res) => {
    try {
        const { farmId } = req.query;
        if (!farmId) {
            return res.status(400).json({ error: "Missing farmId parameter" });
        }

        const db = client.db(dbName);
        const coll = db.collection(collectionName);

        const stats = await coll
            .aggregate([
                { $match: { farmId } },
                {
                    $group: {
                        _id: "$farmId",
                        totalReadings: { $sum: 1 },
                        avgTempC: { $avg: "$sensor.tempC" },
                        avgHumidity: { $avg: "$sensor.humidity" },
                        avgMoisture: { $avg: "$sensor.moisture" },
                        lastReadingTimestamp: { $max: "$timestamp" },
                    },
                },
            ])
            .toArray();

        if (stats.length === 0) {
            return res.status(404).json({ message: `No data found for farmId: ${farmId}` });
        }

        const result = {
            farmId,
            totalReadings: stats[0].totalReadings,
            avgTempC: Number(stats[0].avgTempC.toFixed(2)),
            avgHumidity: Number(stats[0].avgHumidity.toFixed(2)),
            avgMoisture: Number(stats[0].avgMoisture.toFixed(2)),
            lastReadingTimestamp: stats[0].lastReadingTimestamp
                ? new Date(stats[0].lastReadingTimestamp).toISOString()
                : null,
        };

        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching stats:", err);
        res.status(500).json({ error: "Error fetching stats" });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
