require("dotenv").config();
const { MongoClient } = require("mongodb");

const mongoClient = new MongoClient(process.env.MONGODB_URI);

function getRandomReading() {
    return {
        sensorId: "sensor_" + Math.floor(Math.random() * 100),
        reading: parseFloat((Math.random() * 100).toFixed(2)),
        unit: "°C", // or you can randomize units if you like
        updatedAt: new Date().toISOString(),
        meta: {
            author: "Bhavanand Jupalli"
        }
    };
}

async function insertSampleData() {
    try {
        await mongoClient.connect();
        const db = mongoClient.db("AgriDB");
        const collection = db.collection("readings");

        let sampleData = [];
        for (let i = 0; i < 2000; i++) {
            sampleData.push(getRandomReading());
        }

        const result = await collection.insertMany(sampleData);
        console.log(`${result.insertedCount} records inserted successfully!`);

        await mongoClient.close();
    } catch (err) {
        console.error(err);
    }
}

insertSampleData();
