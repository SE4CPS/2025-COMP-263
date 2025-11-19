const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGO_HOST;
const user = process.env.MONGO_USER;
const pass = process.env.MONGO_PASS;

const client = new MongoClient(`${uri}/AgriDB?retryWrites=true&w=majority`, {
  auth: { username: user, password: pass },
});

function randomReading() {
  const units = ["°C", "%", "ppm", "lux", "kPa"];
  return {
    sensorId: "S" + Math.floor(Math.random() * 1000).toString().padStart(4, "0"),
    reading: Number((Math.random() * 100).toFixed(2)),
    unit: units[Math.floor(Math.random() * units.length)],
    updatedAt: new Date().toISOString(),
    meta: {
      author: "Cheng Han Chung",
    },
  };
}

async function run() {
  try {
    await client.connect();
    console.log("MongoDB connected");

    const db = client.db("AgriDB");
    const collection = db.collection("readings");

    const dataset = Array.from({ length: 2000 }, randomReading);
    const result = await collection.insertMany(dataset);

    console.log(`Inserted ${result.insertedCount} records successful`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

run();