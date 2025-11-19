import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function seedDatabase() {
  try {
    await client.connect();
    const db = client.db("AgriDB");
    const collection = db.collection("readings");

    // Create 2000 random sample readings
    const readings = Array.from({ length: 2000 }, (_, i) => ({
      sensorId: `sensorId-${Math.floor(Math.random() * 500) + 1}`,
      reading: (Math.random() * 100).toFixed(2),
      unit: "Celsius",
      updatedAt: new Date().toISOString(),
      meta: {
        author: "Jaideep",
      },
    }));

    // Insert all readings
    const result = await collection.insertMany(readings);
    console.log(`✅ Inserted ${result.insertedCount} records into AgriDB.readings`);
  } catch (err) {
    console.error("Error inserting data:", err);
  } finally {
    await client.close();
  }
}

seedDatabase();
