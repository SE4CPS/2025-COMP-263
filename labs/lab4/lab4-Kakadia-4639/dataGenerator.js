require("dotenv").config();
const { MongoClient } = require("mongodb");

// --- Load from .env ---
const MONGO_HOST = process.env.MONGO_HOST;
const MONGO_DB = process.env.MONGO_DB;
const MONGO_COLLECTION = process.env.MONGO_LAKE_COLLECTION;


function randomReading() {
  const sensorId = `sensor-${Math.floor(Math.random() * 100 + 1)}`;
  const reading = +(Math.random() * 100).toFixed(2);
  const unit = Math.random() > 0.5 ? "°C" : "%";
  const updatedAt = new Date().toISOString();
  const meta = { author: "Ravi Pareshbhai Kakadia" };

  return { sensorId, reading, unit, updatedAt, meta };
}


const readings = Array.from({ length: 2000 }, randomReading);


async function seedMongoDB() {
  const client = new MongoClient(MONGO_HOST);
  try {
    await client.connect();
    const db = client.db(MONGO_DB);
    const collection = db.collection(MONGO_COLLECTION);

    const result = await collection.insertMany(readings);
    console.log(`✅ Successfully inserted ${result.insertedCount} records into ${MONGO_DB}.${MONGO_COLLECTION}`);
  } catch (err) {
    console.error("❌ Error inserting data:", err);
  } finally {
    await client.close();
    console.log("🔒 MongoDB connection closed.");
  }
}

seedMongoDB();
