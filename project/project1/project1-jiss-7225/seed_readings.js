const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";

async function run() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("Project1");
    const collection = db.collection("Readings");

    const readings = [];

    for (let i = 1; i <= 50; i++) {
      readings.push({
        deviceId: `sensor-${String(i).padStart(3, "0")}`,
        farmId: `farm-${Math.ceil(i / 10).toString().padStart(2, "0")}`,
        sensor: {
          tempC: +(Math.random() * 10 + 20).toFixed(2),
          moisture: +(Math.random() * 50 + 30).toFixed(2),
          humidity: +(Math.random() * 20 + 60).toFixed(2)
        },
        gps: {
          lat: +(10 + Math.random()).toFixed(5),
          lon: +(76 + Math.random()).toFixed(5)
        },
        note: "auto-generated IoT reading by Manu Mathew Jiss",
        author: "Manu Mathew Jiss",
        timestamp: new Date().toISOString(),
        ingestedAt: new Date().toISOString()
      });
    }

    const result = await collection.insertMany(readings);
    console.log(`${result.insertedCount} readings inserted successfully! ✅`);
  } catch (err) {
    console.error("❌ Error inserting data:", err);
  } finally {
    await client.close();
  }
}

run();