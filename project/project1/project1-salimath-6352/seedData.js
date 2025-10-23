// This script requires the 'mongodb' package.
// Install it by running: npm install mongodb
import { MongoClient } from 'mongodb';

// NOTE: Please replace the connection string below with the actual one 
// provided for your class cluster if it differs, though this one should work:
const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const dbName = "Project1";
const collectionName = "Readings";

// --- Configuration for Sample Data ---
const NUMBER_OF_READINGS = 55; // Generating more than 50 just to be safe.
const DEVICE_IDS = ["sensor-001", "sensor-002", "sensor-003", "sensor-004", "sensor-005"];
const FARM_IDS = ["farm-01", "farm-02", "farm-03"];
// Central location (e.g., California's Central Valley) for GPS data variation
const BASE_LAT = 36.7783; 
const BASE_LON = -119.4179;

/**
 * Generates a random number within a specified range.
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @param {number} decimals - Number of decimal places.
 * @returns {number} The random number.
 */
const getRandom = (min, max, decimals = 1) => {
    const factor = Math.pow(10, decimals);
    return Math.round((Math.random() * (max - min) + min) * factor) / factor;
};

/**
 * Generates a single sample IoT reading document.
 * @returns {object} A complete IoT reading document.
 */
const generateReading = (index) => {
    // Random device and farm IDs
    const deviceId = DEVICE_IDS[index % DEVICE_IDS.length];
    const farmId = FARM_IDS[Math.floor(Math.random() * FARM_IDS.length)];

    // Generate a random timestamp within the last 30 days
    const pastDate = new Date();
    // Shift back up to 30 days (30 * 24 * 60 * 60 * 1000 milliseconds)
    const maxTimeShift = 30 * 24 * 60 * 60 * 1000;
    const randomShift = Math.random() * maxTimeShift;
    pastDate.setTime(Date.now() - randomShift);

    return {
        deviceId: deviceId,
        farmId: farmId,
        sensor: {
            // Temperature in Celsius (15.0 to 40.0)
            tempC: getRandom(15, 40, 1), 
            // Soil moisture percentage (20 to 80)
            moisture: getRandom(20, 80, 0),
            // Air humidity percentage (30 to 90)
            humidity: getRandom(30, 90, 0),
        },
        gps: {
            // Latitude variation (+/- 0.5 degrees)
            lat: getRandom(BASE_LAT - 0.5, BASE_LAT + 0.5, 5), 
            // Longitude variation (+/- 0.5 degrees)
            lon: getRandom(BASE_LON - 0.5, BASE_LON + 0.5, 5),
        },
        // Example note based on the reading
        note: `Reading #${index + 1}: ${deviceId} reported data. Temp is currently ${getRandom(20, 30, 1)}C.`,
        // Sensor reading timestamp (in the past)
        timestamp: pastDate, 
        // Insertion time (now)
        ingestedAt: new Date(),
    };
};

/**
 * Main function to connect to MongoDB and insert data.
 */
async function run() {
    const client = new MongoClient(uri);

    try {
        console.log("Connecting to MongoDB Atlas cluster...");
        await client.connect();
        console.log("Successfully connected to the database server.");

        const database = client.db(dbName);
        const readingsCollection = database.collection(collectionName);

        // 1. Generate the sample data
        const readings = [];
        for (let i = 0; i < NUMBER_OF_READINGS; i++) {
            readings.push(generateReading(i));
        }

        console.log(`Attempting to insert ${readings.length} sample documents into ${dbName}.${collectionName}...`);

        // 2. Insert the data
        const result = await readingsCollection.insertMany(readings);
        
        console.log(`\n✅ Success! ${result.insertedCount} documents were successfully inserted.`);
        console.log("Please take a screenshot of MongoDB Compass now showing the inserted data.");

    } catch (e) {
        console.error("An error occurred during the insertion process:", e);
    } finally {
        // 3. Close the connection
        await client.close();
        console.log("Connection closed.");
    }
}

run();
