const { MongoClient } = require("mongodb");

// >>> Use the class connection string exactly as given:
const URI = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";

const DB_NAME = "Project1";
const COLL_NAME = "Readings";
const N = 60; // insert at least 50

function randIn(min, max) {
  return Math.random() * (max - min) + min;
}

function fixed(n, d = 3) {
  return Number(n.toFixed(d));
}

function randomReading(i) {
  // cycle a few device/farm ids
  const deviceNum = (i % 12) + 1; // sensor-001 ... sensor-012
  const farmNum = (i % 4) + 1;    // farm-01 .. farm-04

  // simple bounding box (e.g., Central Valley, CA)
  const baseLat = 37.80;
  const baseLon = -121.30;

  // timestamps: spread across last ~36 hours
  const now = new Date();
  const pastMs = Math.floor(randIn(0, 36 * 60)) * 60 * 1000; // minutes → ms
  const ts = new Date(now.getTime() - pastMs);

  return {
    deviceId: `sensor-${String(deviceNum).padStart(3, "0")}`,
    farmId: `farm-${String(farmNum).padStart(2, "0")}`,
    sensor: {
      tempC: fixed(randIn(10, 38)),        // 10–38 °C
      moisture: fixed(randIn(12, 52)),     // %
      humidity: fixed(randIn(20, 95)),     // %
    },
    gps: {
      lat: fixed(baseLat + randIn(-0.25, 0.25), 6),
      lon: fixed(baseLon + randIn(-0.25, 0.25), 6),
    },
    note: i % 10 === 0 ? "calibration check" : "sample reading",
    timestamp: ts.toISOString(),           // UTC ISO 8601
    ingestedAt: new Date().toISOString(),  // current UTC
  };
}

(async () => {
  const client = new MongoClient(URI, { appName: "COMP263-Seeder" });
  try {
    await client.connect();
    const col = client.db(DB_NAME).collection(COLL_NAME);

    // Optional: tag these docs so you can re-run without duping
    const batch = Array.from({ length: N }, (_, i) => ({
      ...randomReading(i),
      _seedTag: "lab2-seed", // makes cleanup easy if needed
    }));

    const result = await col.insertMany(batch, { ordered: false });
    console.log(`Inserted ${result.insertedCount} documents.`);
  } catch (err) {
    console.error("Seeding failed:", err);
  } finally {
    await client.close();
  }
})();