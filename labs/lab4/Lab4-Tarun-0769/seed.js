/**
 * seed.js
 * Inserts 2000 sample sensor readings into MongoDB
 * Guarantees author = "Srinivas Tarun Sai"
 */

import { MongoClient } from "mongodb";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Use fixed author name to avoid conflicts
const AUTHOR = "Srinivas Tarun Sai";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://i40:dbms2@cluster0.lixbqmp.mongodb.net/AgriDB?retryWrites=true&w=majority";
const MONGODB_DB = process.env.MONGODB_DB || "AgriDB";
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || "readings";

const client = new MongoClient(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Top-level await (Node 14.8+)
try {
  await client.connect();
  console.log("✅ Connected to MongoDB");

  const db = client.db(MONGODB_DB);
  const readings = db.collection(MONGODB_COLLECTION);

  // Optional: Clear existing data
  // await readings.deleteMany({});

  const now = new Date();
  const units = ["°C", "%", "kPa", "ppm", "m/s"];

  const docs = Array.from({ length: 2000 }, (_, i) => ({
    sensorId: `sensor-${(i % 50) + 1}`,
    reading: Number((Math.random() * 100).toFixed(2)),
    unit: units[i % units.length],
    timestamp: now,
    updatedAt: now.toISOString(),
    metadata: {
      author: AUTHOR,
      last_sync: now.toISOString()
    }
  }));

  const result = await readings.insertMany(docs);
  console.log(`✅ Inserted ${result.insertedCount} documents into ${MONGODB_DB}.${MONGODB_COLLECTION}`);
  console.log(`✅ Author: ${AUTHOR}`);

  // Show a sample document
  const sample = await readings.findOne({});
  console.log("\nSample document:");
  console.log(JSON.stringify(sample, null, 2));

} catch (err) {
  console.error("❌ Seed error:", err);
} finally {
  await client.close();
  console.log("\nConnection closed");
}