// Seed.js
import { MongoClient } from "mongodb";

// 🔗 Replace with your actual MongoDB URI
const MONGO_URI = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const DB_NAME = "Project1";
const COLLECTION_NAME = "Readings";

const client = new MongoClient(MONGO_URI);

function randomFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function randomNote() {
  const notes = [
    "Normal reading",
    "Slightly above average temperature",
    "Moisture below threshold",
    "Sensor recalibration required",
    "Data verified successfully",
    "Low humidity detected",
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

async function seedDatabase() {
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const readings = [];

    for (let i = 1; i <= 50; i++) {
      const deviceId = `sensor-${String(i).padStart(3, "0")}`;
      const farmId = `farm-${String(Math.ceil(i / 10)).padStart(2, "0")}`;

      readings.push({
        deviceId,
        farmId,
        sensor: {
          tempC: randomFloat(10, 40),
          moisture: randomFloat(30, 90),
          humidity: randomFloat(20, 80),
        },
        gps: {
          lat: randomFloat(37.0, 38.0),
          lon: randomFloat(-122.0, -121.0),
        },
        note: randomNote(),
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 1e8)).toISOString(),
        ingestedAt: new Date().toISOString(),
      });
    }

    const result = await collection.insertMany(readings);
    console.log(`✅ Inserted ${result.insertedCount} sample IoT readings.`);
  } catch (err) {
    console.error("❌ Error inserting data:", err);
  } finally {
    await client.close();
    console.log("🔚 MongoDB connection closed.");
  }
}

seedDatabase();
