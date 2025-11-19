const { MongoClient } = require("mongodb");
const crypto = require("crypto");

const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("Lab2");
    const collection = db.collection("Agriculture");

    // Generate 10 unique objects for Utkarsh
    const rawObjects = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,  // keep 1–10, but scoped by your author/metadata
      sensorId: `UTK_SENSOR_${i + 1}`,
      reading: (Math.random() * 50 + 20).toFixed(2), // 20–70 range
      timestamp: new Date().toISOString(),
      notes: `Utkarsh sync reading ${i + 1}`
    }));

    // Metadata (unique to you)
    const metadata = {
      author: "Utkarsh Ajay Gawande",
      last_sync: new Date().toISOString(),
      uuid_source: crypto.randomUUID()
    };

    // Upsert only YOUR 10 docs
    const ops = rawObjects.map(obj => ({
      updateOne: {
        // Filter: match on your author + id to avoid touching others
        filter: { id: obj.id, "metadata.author": "Utkarsh Ajay Gawande" },
        update: {
          $set: {
            ...obj,
            timestamp: new Date(obj.timestamp).toISOString(),
            metadata: { ...metadata }
          }
        },
        upsert: true
      }
    }));

    const result = await collection.bulkWrite(ops);

    console.log(
      `✅ Upserted ${result.upsertedCount} docs, Modified ${result.modifiedCount} docs (only your 10).`
    );
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
