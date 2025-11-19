import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);
const dbName = "LabLake";
const collectionName = "lake";

function randomSensorId() {
  return `SENSOR-${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
}

function randomReading() {
  return Number((Math.random() * 100).toFixed(2));
}

function randomUnit() {
  const units = ["°C", "%", "kPa", "ppm", "m/s"];
  return units[Math.floor(Math.random() * units.length)];
}

async function seed() {
  try {
    await client.connect();
    const db = client.db(dbName);
    const readings = db.collection(collectionName);

    const docs = Array.from({ length: 2000 }, () => ({
      sensorId: randomSensorId(),
      reading: randomReading(),
      unit: randomUnit(),
      updatedAt: new Date().toISOString(),
      meta: {
        author: "Khoa Thai Dang Tran",
      },
    }));

    const result = await readings.insertMany(docs);
    console.log(`Inserted ${result.insertedCount} sample records into '${collectionName}'`);
  } catch (err) {
    console.error("Seeding failed:", err.message);
  } finally {
    await client.close();
  }
}

seed();
