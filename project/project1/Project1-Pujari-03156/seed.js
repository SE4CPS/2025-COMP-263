import { MongoClient, Double } from "mongodb";

const MONGO_URI = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const DB_NAME = "Project1";
const COLLECTION = "Readings";
const AUTHOR = "Shradha Pujari";

function D(n, decimals = null) {
  // Always store as BSON Double to satisfy schemas that require "double"
  const v = typeof n === "number" ? n : Number(n);
  const x = Number.isFinite(v) ? v : 0;
  return new Double(decimals != null ? Number(x.toFixed(decimals)) : x);
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const col = client.db(DB_NAME).collection(COLLECTION);

  const farms = ["farm-01", "farm-02"];
  const devices = Array.from({ length: 10 }, (_, i) => `sensor-${String(i + 1).padStart(3, "0")}`);
  const now = Date.now();

  const docs = [];
  for (let i = 0; i < 60; i++) {
    const ts = new Date(now - i * 60000);

    // Generate constrained values
    const tempC = 10 + Math.random() * 30;     // 10..40
    const moisture = Math.random() * 100;      // 0..100
    const humidity = 20 + Math.random() * 70;  // 20..90
    const lat = 37 + Math.random();            // 37..38
    const lon = -122.5 + Math.random() * 1.5;  // -122.5..-121.0

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
      // Use a string (some validators reject null even if we planned for it)
      note: (i % 10 === 0) ? "routine check" : "seed",
      timestamp: ts,           // Date (UTC)
      ingestedAt: new Date()   // Date (UTC)
    });
  }

  try {
    // ordered:false => insert what passes, report errors for failures
    const result = await col.insertMany(docs, { ordered: false, bypassDocumentValidation: false });
    console.log(`Inserted ${result.insertedCount} readings for ${AUTHOR}.`);
  } catch (e) {
    // Print the first detailed validation error to pinpoint the field
    console.error("Seed failed. First error detail:");
    const first = e?.errorResponse?.writeErrors?.[0];
    if (first) {
      console.error(first.err?.errmsg || first.errmsg || first);
      console.error("Offending document:", first.err?.op);
    } else {
      console.error(e);
    }
    process.exit(1);
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
