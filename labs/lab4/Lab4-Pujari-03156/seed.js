require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || "mongodb+srv://i40:dbms2@cluster0.lixbqmp.mongodb.net/";

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(process.env.MONGODB_DB || "AgriDB");
    const readings = db.collection(process.env.MONGODB_COLLECTION || "readings");

    // Optional: Clear existing data
    // await readings.deleteMany({});

    const docs = [];
    for (let i = 1; i <= 2000; i++) {
      docs.push({
        sensorId: `sensor-${(i % 50) + 1}`,
        reading: Number((Math.random() * 100).toFixed(2)),
        unit: "Celsius",
        timestamp: new Date(),
        updatedAt: new Date().toISOString(),
        meta: {
          author: process.env.AUTHOR || "Shradha Pujari"
        }
      });
    }

    const result = await readings.insertMany(docs);
    console.log(`✓ Successfully inserted ${result.insertedCount} documents into ${process.env.MONGODB_DB || "AgriDB"}.${process.env.MONGODB_COLLECTION || "readings"}`);
    console.log(`✓ Author: ${process.env.AUTHOR || "Shradha Pujari"}`);
    
    // Display sample document
    const sample = await readings.findOne({});
    console.log("\nSample document:");
    console.log(JSON.stringify(sample, null, 2));
    
  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    await client.close();
    console.log("\nConnection closed");
  }
}

run();