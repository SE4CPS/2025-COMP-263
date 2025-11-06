require("dotenv").config();
const { MongoClient } = require("mongodb");

const { MONGO_URI, MONGO_DB, MONGO_COLLECTION, AUTHOR = "Shradha Pujari" } = process.env;

(async () => {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const col = client.db(MONGO_DB).collection(MONGO_COLLECTION);

  const units = ["°C", "%", "kPa", "ppm", "m/s"];
  const now = Date.now();
  const docs = Array.from({ length: 2000 }, (_, i) => ({
    sensorId: `sensor-${(i % 200) + 1}`,
    reading: +(Math.random() * 100).toFixed(2),
    unit: units[i % units.length],
    updatedAt: new Date(now - Math.random() * 86400000).toISOString(),
    meta: { author: AUTHOR }
  }));

  const result = await col.insertMany(docs);
  console.log(`Inserted ${result.insertedCount} docs by ${AUTHOR}`);
  await client.close();
})();
