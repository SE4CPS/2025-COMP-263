// insertSampleData.js
require("dotenv").config();
const { MongoClient } = require("mongodb");

const HOST = process.env.MONGO_HOST;
const USER = process.env.MONGO_USER;
const PASS = process.env.MONGO_PASS;

const uri = `${HOST}/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  auth: { username: USER, password: PASS },
  authSource: "admin",
});

async function run() {
  try {
    await client.connect();
    const db = client.db("AgriDB");
    const collection = db.collection("readings");

    const docs = Array.from({ length: 2000 }).map((_, i) => {

      const units = ["°C", "%RH", "kPa"];
      const unit = units[Math.floor(Math.random() * units.length)];

      return {
        sensorId: `sensor-${1000 + i}`,
        reading: Number((Math.random() * 100).toFixed(2)),
        unit: unit,
        updatedAt: new Date(),
        meta: {
          author: "Yu-Tai Lee",
        },
      };
    });

    const result = await collection.insertMany(docs);
    console.log(`inserted ${result.insertedCount} documents into AgriDB.readings`);
  } catch (err) {
    console.error("insert error:", err.message || err);
  } finally {
    await client.close();
  }
}

run();
