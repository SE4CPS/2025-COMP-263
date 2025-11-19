// --- Imports ---
const { MongoClient } = require("mongodb");
const crypto = require("crypto");

// --- Connection setup ---
const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/Lab2?retryWrites=true&w=majority";
const client = new MongoClient(uri);

// --- Metadata ---
const metadata = {
  author: "Jaideep Parulekar",
  last_sync: new Date().toISOString(), // UTC ISO timestamp
  uuid_source: crypto.randomUUID()
};

// --- Prepare 10 Objects with Metadata ---
const objects = Array.from({ length: 10 }, (_, i) => i + 1).map((id) => ({
  id,
  sensorId: `SENSOR-${id}`,
  reading: (id * 6.5).toFixed(2),
  timestamp: new Date(Date.now() + id * 1000).toISOString(), // UTC
  notes: `MongoDB sync reading ${id}`,
  metadata
}));

// --- Sync Function ---
async function syncData() {
  try {
    await client.connect();
    const db = client.db("Lab2");
    const collection = db.collection("Agriculture");

    // Clear collection before inserting new docs
    await collection.deleteMany({});

    // Insert exactly 10 docs using reduce
    await objects.reduce(
      async (p, obj) => {
        await p;
        await collection.insertOne(obj);
      },
      Promise.resolve()
    );

    // Verify count
    const count = await collection.countDocuments();
    console.log(`✅ Inserted ${count} documents into Lab2.Agriculture`);

    // Fetch one document as preview
    const sample = await collection.findOne({});
    console.log("Sample Document:", sample);

  } catch (err) {
    console.error("❌ Error syncing:", err);
  } finally {
    await client.close();
  }
}

syncData();
