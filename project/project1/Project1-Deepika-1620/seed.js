import { MongoClient, Double } from "mongodb";

// ====== CONFIG (edit if needed) ======
const MONGO_URI = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const DB_NAME = "Project1";
const COLLECTION = "Readings";
const AUTHOR = "Deepika Jakati";
// ====================================

// Helper for BSON Double (ensures correct numeric type)
function D(n, decimals = null) {
  const v = typeof n === "number" ? n : Number(n);
  const x = Number.isFinite(v) ? v : 0;
  return new Double(decimals != null ? Number(x.toFixed(decimals)) : x);
}

async function main() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const col = client.db(DB_NAME).collection(COLLECTION);

    const farms = ["farm-01", "farm-02"];
    const devices = Array.from({ length: 10 }, (_, i) => `sensor-${String(i + 1).padStart(3, "0")}`);
    const now = Date.now();

    const docs = [];
    for (let i = 0; i < 60; i++) {
      const ts = new Date(now - i * 60000); // 1-minute intervals
      const tempC = 10 + Math.random() * 30;
      const moisture = Math.random() * 100;
      const humidity = 20 + Math.random() * 70;
      const lat = 37 + Math.random();
      const lon = -122.5 + Math.random() * 1.5;

      docs.push({
        author: AUTHOR,
        deviceId: devices[i % devices.length],
        farmId: farms[i % farms.length],
        sensor: {
          tempC: D(tempC, 1),
          moisture: D(moisture, 1),
          humidity: D(humidity, 1)
        },
        gps: {
          lat: D(lat, 6),
          lon: D(lon, 6)
        },
        note: i % 10 === 0 ? "routine check" : "seed",
        timestamp: ts,
        ingestedAt: new Date()
      });
    }

    const result = await col.insertMany(docs, { ordered: false });
    console.log(`✅ Inserted ${result.insertedCount ?? docs.length} readings for ${AUTHOR}.`);
  } catch (e) {
    console.error("❌ Seeding failed:", e);
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
