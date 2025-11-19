import { MongoClient } from "mongodb";

const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("Lab2");
    const collection = db.collection("Agriculture");

    const now = new Date().toISOString();
    const objects = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      sensorId: `sensor-${(i % 3) + 1}`,
      reading: Math.random() * 100,
      timestamp: now,
      notes: `Reading ${i + 1}`,
      metadata: {
        author: "Manu Mathew Jiss",
        last_sync: now,
        uuid_source: crypto.randomUUID()
      }
    }));

    await collection.insertMany(objects);
    console.log("✅ Successfully inserted 10 objects with metadata!");
  } catch (err) {
    console.error("❌ Error inserting objects:", err);
  } finally {
    await client.close();
  }
}

run();