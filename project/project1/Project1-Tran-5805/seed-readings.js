require('dotenv').config();
const { MongoClient } = require('mongodb');

const HOST = process.env.MONGO_HOST;
const USER = process.env.MONGO_USER;
const PASS = process.env.MONGO_PASS;
const DB_NAME = process.env.MONGO_DB || "Project1";
const COLLECTION_NAME = "Readings";

(function validateEnv() {
  const missing = [];
  if (!HOST) missing.push("MONGO_HOST");
  if (!USER) missing.push("MONGO_USER");
  if (!PASS) missing.push("MONGO_PASS");
  if (missing.length) {
    console.error("Missing env var(s):", missing.join(", "));
    process.exit(1);
  }
})();

const client = new MongoClient(`${HOST}?retryWrites=true&w=majority`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  auth: { username: USER, password: PASS },
  authSource: "admin"
});

function generateReading(index) {
  const deviceId = `sensor-${String(index + 1).padStart(3, '0')}`;
  const farmId = `farm-${String((index % 5) + 1).padStart(2, '0')}`;
  const tempC = +(20 + Math.random() * 10).toFixed(2);
  const moisture = +(30 + Math.random() * 20).toFixed(2);
  const humidity = +(40 + Math.random() * 30).toFixed(2);
  const lat = +(37.0 + Math.random()).toFixed(6);
  const lon = +(-121.0 + Math.random()).toFixed(6);
  const timestamp = new Date(Date.now() - Math.floor(Math.random() * 100000000)).toISOString();
  const ingestedAt = new Date().toISOString();
  const author = "Khoa Thai Dang Tran";

  return {
    deviceId,
    farmId,
    sensor: { tempC, moisture, humidity },
    gps: { lat, lon },
    note: `Auto-generated reading ${index + 1}`,
    timestamp,
    author,
    ingestedAt
  };
}

(async function insertReadings() {
  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const readings = Array.from({ length: 50 }, (_, i) => generateReading(i));
    const result = await collection.insertMany(readings);
    console.log(`Inserted ${result.insertedCount} readings into ${DB_NAME}.${COLLECTION_NAME}`);
  } catch (err) {
    console.error("Error:", err.message || err);
  } finally {
    await client.close();
    console.log("Connection closed.");
  }
})();