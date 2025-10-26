// insert_readings.js

const { MongoClient } = require("mongodb");

// MongoDB connection string
const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";

// Database and collection names
const dbName = "Project1";
const collectionName = "Readings";

// Generate random float values within a range
function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// Generate sample IoT readings
function generateReadings(count = 50) {
  const readings = [];
  for (let i = 1; i <= count; i++) {
    const deviceId = `sensor-${String(i).padStart(3, "0")}`;
    const farmId = `farm-${String(((i - 1) % 5) + 1).padStart(2, "0")}`; // 5 farms

    readings.push({
      deviceId,
      farmId,
      sensor: {
        tempC: randomFloat(15, 40),
        moisture: randomFloat(20, 90),
        humidity: randomFloat(30, 95),
      },
      gps: {
        lat: randomFloat(-90, 90, 6),
        lon: randomFloat(-180, 180, 6),
      },
      note: `Automated sample reading ${i}`,
      timestamp: new Date().toISOString(), // reading time in UTC
      ingestedAt: new Date().toISOString(), // ingestion time in UTC
      createdBy: "Anusha", // added field
    });
  }
  return readings;
}

// Main function
async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const sampleReadings = generateReadings(50);
    const result = await collection.insertMany(sampleReadings);

    console.log(`✅ Inserted ${result.insertedCount} IoT readings into '${collectionName}' collection.`);
  } catch (err) {
    console.error("❌ Error inserting data:", err);
  } finally {
    await client.close();
    console.log("🔒 Connection closed.");
  }
}

main();
