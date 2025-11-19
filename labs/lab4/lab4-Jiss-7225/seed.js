require("dotenv").config();
const mongoose = require("mongoose");

const units = ["°C", "%", "ppm", "kPa"];

function getRandomReading() {
  return parseFloat((Math.random() * 100).toFixed(2));
}

function getRandomUnit() {
  return units[Math.floor(Math.random() * units.length)];
}

function getRandomTimestamp() {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const randomTime = thirtyDaysAgo + Math.random() * (now - thirtyDaysAgo);
  return new Date(randomTime).toISOString();
}

function generateSensorId(index) {
  return `sensor-${String(index).padStart(5, "0")}`;
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.useDb("AgriDB");
    const collection = db.collection("readings");

    const deleteResult = await collection.deleteMany({
      "meta.author": "Manu Mathew Jiss"
    });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing records`);

    const records = [];
    for (let i = 1; i <= 2000; i++) {
      records.push({
        sensorId: generateSensorId(i),
        reading: getRandomReading(),
        unit: getRandomUnit(),
        updatedAt: getRandomTimestamp(),
        meta: {
          author: "Manu Mathew Jiss"
        }
      });
    }

    const insertResult = await collection.insertMany(records, {
      ordered: false
    });
    console.log(`✅ Inserted ${Object.keys(insertResult.insertedIds).length} records`);

    console.log("\n📄 First inserted document:");
    console.log(records[0]);

    console.log("\n📄 Last inserted document:");
    console.log(records[records.length - 1]);

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

run();
