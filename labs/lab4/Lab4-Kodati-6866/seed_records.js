require("dotenv").config();
const { MongoClient } = require("mongodb");

const mongoURI = process.env.MONGODB_URI;
const client = new MongoClient(mongoURI);

async function seedData() {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");

        const db = client.db("AgriDB");
        const readings = db.collection("readings");

        // Create 2000 random sample records
        const data = Array.from({ length: 2000 }).map((_, i) => ({
            sensorId: `sensor-${Math.floor(Math.random() * 100)}`,
            reading: (Math.random() * 100).toFixed(2),
            unit: "Celsius",
            updatedAt: new Date().toISOString(), // UTC timestamp
            meta: {
                author: "Pavan Sriram Kodati" // or your name / student ID
            }
        }));

        const result = await readings.insertMany(data);
        console.log(`Inserted ${result.insertedCount} records into readings`);
    } catch (err) {
        console.error("Error inserting data:", err);
    } finally {
        await client.close();
        console.log("Connection closed");
    }
}

seedData();
