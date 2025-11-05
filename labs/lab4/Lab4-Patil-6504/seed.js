import 'dotenv/config';
import { connectMongoDB, disconnectMongoDB, getCollection } from './config/mongodb.js';

async function run() {
  try {
    await connectMongoDB();
    const collection = getCollection(); // AgriDB.readings

    const data = Array.from({ length: 2000 }).map((_, i) => ({
      sensorId: `sensor-${i}`,
      reading: Math.random() * 100,
      unit: '°C',
      updatedAt: new Date(),
      meta: { author: 'Darshana' },
    }));

    const result = await collection.insertMany(data);
    console.log(`Inserted ${result.insertedCount} documents`);
  } finally {
    await disconnectMongoDB();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});