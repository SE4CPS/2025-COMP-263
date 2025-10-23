import { MongoClient } from "mongodb";

const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const client = new MongoClient(uri);

function randomFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSampleData(count = 50) {
  const data = [];
  for (let i = 1; i <= count; i++) {
    data.push({
      deviceId: `sensor-${String(i).padStart(3, "0")}`,
      farmId: `farm-${String(randomInt(1, 3)).padStart(2, "0")}`,
      sensor: {
        tempC: randomFloat(10, 40),
        moisture: randomFloat(20, 80),
        humidity: randomFloat(30, 90),
      },
      gps: {
        lat: randomFloat(-90, 90),
        lon: randomFloat(-180, 180),
      },
      note: "Cheng Han Chung",
      timestamp: new Date().toISOString(),
      ingestedAt: new Date().toISOString(),
    });
  }
  return data;
}

async function main() {
  try {
    await client.connect();
    const db = client.db("Project1");
    const collection = db.collection("Readings");

    const sampleData = generateSampleData(50);
    const result = await collection.insertMany(sampleData);

    console.log(`Successfully inserted ${result.insertedCount} documents.`);
  } catch (err) {
    console.error("Error inserting data:", err);
  } finally {
    await client.close();
  }
}

main();