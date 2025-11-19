// seed_readings.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

// Load environment variables
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'AgriDB';
const collectionName = process.env.COLLECTION || 'readings';

async function seedData() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Clear existing data (optional)
    await collection.deleteMany({ meta: { author: "Anusha K Nataraja" } });

    // Generate 2000 random records
    const records = Array.from({ length: 2000 }).map((_, i) => ({
      sensorId: `sensor-${(i % 100) + 1}`,
      reading: Number((Math.random() * 100).toFixed(2)),
      unit: "°C",
      updatedAt: new Date().toISOString(),
      meta: {
        author: "Anusha K Nataraja",
      },
    }));

    const result = await collection.insertMany(records);
    console.log(`✅ Inserted ${result.insertedCount} sample records into ${dbName}.${collectionName}`);
  } catch (err) {
    console.error("❌ Error inserting data:", err);
  } finally {
    await client.close();
  }
}

seedData();
