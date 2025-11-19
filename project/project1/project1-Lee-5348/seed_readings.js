require("dotenv").config();
const { MongoClient } = require("mongodb");

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.MONGO_DB);
    const collection = db.collection(process.env.MONGO_COLLECTION);

    const docs = [];
    for (let i = 1; i <= 50; i++) {
      const now = new Date();
      docs.push({
        deviceId: `sensor-${String(i).padStart(3, "0")}`,
        farmId: `farm-${String(Math.ceil(i / 10)).padStart(2, "0")}`,
        sensor: {
          tempC: Math.round((10 + Math.random() * 15) * 100) / 100,
          moisture: Math.round((30 + Math.random() * 40) * 100) / 100,
          humidity: Math.round((40 + Math.random() * 30) * 100) / 100,
        },
        gps: {
          lat: 37.0 + Math.random(),
          lon: -122.0 + Math.random(),
        },
        note: "Sample IoT reading by Yu-Tai",
        timestamp: now.toISOString(),
        ingestedAt: now,
      });
    }

    const result = await collection.insertMany(docs);
    console.log(`✅ Inserted ${result.insertedCount} documents.`);
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.close();
  }
}

main();
