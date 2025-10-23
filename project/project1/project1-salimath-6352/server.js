import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';

// --- Configuration ---

// MongoDB Connection Details (MUST match the connection string from your setup)
const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const dbName = "Project1";
const collectionName = "Readings";
const port = 3000;

// Global variable for the MongoDB collection reference
let readingsCollection;

// Initialize Express app
const app = express();

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// --- Database Connection Initialization ---

async function connectToMongo() {
    console.log("Attempting to connect to MongoDB Atlas...");
    const client = new MongoClient(uri, { 
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });

    try {
        await client.connect();
        console.log("Successfully connected to MongoDB.");
        const db = client.db(dbName);
        readingsCollection = db.collection(collectionName);
    } catch (err) {
        console.error("Failed to connect to MongoDB. Server will not start.", err);
        // Exit process if the database connection fails, as it's critical
        process.exit(1); 
    }
}

// -----------------------------------------------------------
// 1. POST /readings -> Insert a new reading
// -----------------------------------------------------------
app.post('/readings', async (req, res) => {
    const reading = req.body;

    // Basic validation for mandatory nested fields
    if (!reading.deviceId || !reading.farmId || !reading.sensor || !reading.gps) {
        return res.status(400).json({ 
            error: "Missing required fields. 'deviceId', 'farmId', 'sensor', and 'gps' must be provided." 
        });
    }
    
    // Use the provided timestamp or the server's current time if missing
    const timestamp = reading.timestamp ? new Date(reading.timestamp) : new Date();
    // Always use the server's current time for ingestion tracking
    const ingestedAt = new Date();

    const documentToInsert = {
        ...reading,
        timestamp,
        ingestedAt
    };

    try {
        const result = await readingsCollection.insertOne(documentToInsert);
        res.status(201).json({ 
            message: "Reading inserted successfully.",
            _id: result.insertedId,
            document: documentToInsert 
        });
    } catch (error) {
        console.error("Error inserting reading:", error);
        res.status(500).json({ error: "Internal server error during insert." });
    }
});

// -----------------------------------------------------------
// 2. GET /readings?since=...&limit=... -> Query recent readings
// -----------------------------------------------------------
app.get('/readings', async (req, res) => {
    const { since, limit } = req.query;
    
    const filter = {};
    const sort = { timestamp: -1 }; // Sort by newest readings first
    
    // Parse and set limit, defaulting to 20
    const queryLimit = parseInt(limit, 10);
    const finalLimit = isNaN(queryLimit) || queryLimit <= 0 ? 20 : Math.min(queryLimit, 100); // Max 100 to prevent large requests

    // Filter by timestamp if 'since' is provided
    if (since) {
        try {
            const sinceDate = new Date(since);
            if (isNaN(sinceDate.getTime())) {
                 return res.status(400).json({ 
                    error: "Invalid 'since' parameter. Must be a valid date string (e.g., ISO 8601)." 
                });
            }
            // Find readings *greater than or equal* to the provided date
            filter.timestamp = { $gte: sinceDate };
        } catch (e) {
             return res.status(400).json({ 
                error: "Invalid 'since' parameter format." 
            });
        }
    }

    try {
        const readings = await readingsCollection
            .find(filter)
            .sort(sort)
            .limit(finalLimit)
            .toArray();

        res.json({
            count: readings.length,
            limit: finalLimit,
            filter: filter,
            readings: readings
        });

    } catch (error) {
        console.error("Error fetching readings:", error);
        res.status(500).json({ error: "Internal server error during fetch." });
    }
});

// -----------------------------------------------------------
// 3. GET /stats/basic?farmId=... -> Return counts, averages, and last reading timestamp
// -----------------------------------------------------------
app.get('/stats/basic', async (req, res) => {
    const { farmId } = req.query;

    if (!farmId) {
        return res.status(400).json({ error: "The 'farmId' query parameter is required." });
    }

    try {
        // --- 1. Aggregation for Counts and Averages ---
        const aggregationResult = await readingsCollection.aggregate([
            { $match: { farmId: farmId } },
            { $group: {
                _id: "$farmId",
                totalReadings: { $sum: 1 },
                avgTempC: { $avg: "$sensor.tempC" },
                avgMoisture: { $avg: "$sensor.moisture" },
                avgHumidity: { $avg: "$sensor.humidity" }
            }}
        ]).toArray();

        const stats = aggregationResult[0];

        if (!stats) {
            // No documents found for this farmId
            return res.status(404).json({ message: `No readings found for farmId: ${farmId}` });
        }
        
        // --- 2. Query for Last Reading Timestamp ---
        const lastReading = await readingsCollection
            .find({ farmId: farmId })
            .sort({ timestamp: -1 }) // Sort by timestamp descending
            .limit(1)
            .project({ timestamp: 1, _id: 0 }) // Only fetch the timestamp field
            .toArray();

        const lastReadingTimestamp = lastReading.length > 0 
            ? lastReading[0].timestamp 
            : null;

        const response = {
            farmId: stats._id,
            totalReadings: stats.totalReadings,
            lastReadingTimestamp: lastReadingTimestamp,
            averages: {
                tempC: parseFloat(stats.avgTempC.toFixed(2)),
                moisture: parseFloat(stats.avgMoisture.toFixed(2)),
                humidity: parseFloat(stats.avgHumidity.toFixed(2))
            }
        };

        res.json(response);

    } catch (error) {
        console.error("Error calculating basic stats:", error);
        res.status(500).json({ error: "Internal server error during stats calculation." });
    }
});

// --- Start Server ---

// Connect to Mongo, then start the Express server
connectToMongo().then(() => {
    app.listen(port, () => {
        console.log(`\nAPI Server running at http://localhost:${port}`);
        console.log("Endpoints ready for testing.");
        console.log("Remember to set 'Content-Type: application/json' for POST requests.");
    });
});
