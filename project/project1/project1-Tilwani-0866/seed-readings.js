// seed_readings.js
// Inserts sample IoT readings into Project1.Readings with your author tag

const { MongoClient } = require("mongodb");

// Use your real URI or export MONGODB_URI before running
const uri = process.env.MONGODB_URI || "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";

const DB_NAME = "Project1";
const COLL_NAME = "Readings";
const TOTAL = 100; // change to 50 if your rubric needs exactly 50

// ---- Author / run marker ----
const CREATED_BY = "Rohan Jagdish Tilwani";
const RUN_ID = `run-${Date.now()}`;

// Farms / devices / helpers
const FARMS = [
  { farmId: "farm-01", base: { lat: 37.9577, lon: -121.2908 } },
  { farmId: "farm-02", base: { lat: 37.8044, lon: -122.2711 } },
  { farmId: "farm-03", base: { lat: 38.5816, lon: -121.4944 } },
];

const DEVICES = Array.from({ length: 10 }, (_, i) => `sensor-${String(i + 1).padStart(3, "0")}`);
const NOTES = ["normal", "smoke test", "calibration", "low battery", "maintenance"];

function jitter(base, spread = 0.02) { return base + (Math.random() - 0.5) * spread; }
function randIn(min, max) { return Math.random() * (max - min) + min; }
function tsWithinDays(days = 7) {
  const now = Date.now();
  const past = now - Math.floor(Math.random() * days * 24 * 60 * 60 * 1000);
  return new Date(past).toISOString(); // UTC ISO string
}

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const col = client.db(DB_NAME).collection(COLL_NAME);

    await col.createIndex({ deviceId: 1, timestamp: -1 });

    const docs = [];
    for (let i = 0; i < TOTAL; i++) {
      const farm = FARMS[Math.floor(Math.random() * FARMS.length)];
      const deviceId = DEVICES[Math.floor(Math.random() * DEVICES.length)];
      const note = NOTES[Math.floor(Math.random() * NOTES.length)];

      docs.push({
        deviceId,
        farmId: farm.farmId,
        sensor: {
          tempC: Number(randIn(10, 40).toFixed(1)),
          moisture: Number(randIn(10, 90).toFixed(1)),
          humidity: Number(randIn(20, 95).toFixed(1)),
        },
        gps: {
          lat: Number(jitter(farm.base.lat).toFixed(6)),
          lon: Number(jitter(farm.base.lon).toFixed(6)),
        },
        note,
        createdBy: CREATED_BY,   // <-- your name
        runId: RUN_ID,           // <-- unique marker for this run
        timestamp: tsWithinDays(7), // UTC ISO
        ingestedAt: new Date(),     // BSON Date (UTC)
      });
    }

    const res = await col.insertMany(docs, { ordered: false });
    console.log(`Inserted ${res.insertedCount} docs into ${DB_NAME}.${COLL_NAME} with runId=${RUN_ID}`);
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error("Seeding failed:", e);
  process.exit(1);
});
