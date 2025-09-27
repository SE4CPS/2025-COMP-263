// sync.js
const { MongoClient } = require("mongodb");
const { randomUUID } = require("crypto");

const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const client = new MongoClient(uri);

const nowUTC = new Date().toISOString();

// EXACTLY 10 docs (ids 1..10). No loops/ifs: Array.from + map.
const records = Array.from({ length: 10 }, (_, i) => i + 1).map((id) => ({
  id,
  sensorId: `S${id}`,
  reading: Math.floor(10 + Math.random() * 90),
  timestamp: new Date(Date.now() - id * 60_000).toISOString(), // UTC ISO (ends with Z)
  notes: `Record for sensor ${id}`,
  metadata: {
    author: "Keerthana Bhukya",   // <-- your name
    last_sync: nowUTC,            // current UTC
    uuid_source: randomUUID()
  }
}));

async function run() {
  await client.connect();
  const col = client.db("Lab2").collection("Agriculture");

  // Ensure the collection ends up with EXACTLY 10 docs after this run.
  await col.deleteMany({});
  const res = await col.insertMany(records, { ordered: true });
  console.log(`Inserted docs: ${res.insertedCount}`); // should print 10

  await client.close();
}

run().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
