const { MongoClient } = require("mongodb");
const { v4: uuidv4 } = require("uuid");

// 🔗 MongoDB Atlas connection
const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const dbName = "Lab2";
const collectionName = "Agriculture";

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas!");

    const fixedLastSync = "2025-09-15T19:00:00Z"; // fixed last_sync

    // Generate 10 sensor readings using map and reduce
    const data = Array.from({ length: 10 }) // [undefined, ..., undefined] length 10
      .map((_, i) => ({
        id: i + 1,
        sensorId: `sensor-${i + 1}`,
        reading: Math.floor(Math.random() * 100),
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        notes: `Reading ${i + 1}`,
        author: "Anusha Nataraja",
        last_sync: fixedLastSync,
        uuid_source: uuidv4(),
      }))
      .filter(Boolean) // ensures all elements are kept (optional, required for pure map/filter usage)
      .reduce((acc, curr) => acc.concat(curr), []); // flatten into one array (no loops)

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const result = await collection.insertMany(data);
    console.log(`✅ Inserted ${result.insertedCount} documents`);
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.close();
  }
}

run();
