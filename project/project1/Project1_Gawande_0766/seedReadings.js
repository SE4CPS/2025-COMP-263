const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("Project1");
    const collection = db.collection("Readings");

    const farms = ["farm-01", "farm-02", "farm-03"];
    const devices = ["sensor-001", "sensor-002", "sensor-003", "sensor-004", "sensor-005"];
    const authorName = "Utkarsh Ajay Gawande"; 

    const readings = [];

    for (let i = 0; i < 50; i++) {
      const farmId = farms[Math.floor(Math.random() * farms.length)];
      const deviceId = devices[Math.floor(Math.random() * devices.length)];

      const tempC = (20 + Math.random() * 10).toFixed(2);
      const moisture = (30 + Math.random() * 20).toFixed(2);
      const humidity = (40 + Math.random() * 30).toFixed(2);

      const lat = 37.7 + Math.random() * 0.1;   
      const lon = -121.4 + Math.random() * 0.1;

      const doc = {
        deviceId,
        farmId,
        sensor: {
          tempC: Number(tempC),
          moisture: Number(moisture),
          humidity: Number(humidity),
        },
        gps: { lat, lon },
        note: `Auto-generated reading ${i + 1}`,
        timestamp: new Date().toISOString(),
        ingestedAt: {
          time: new Date().toISOString(),
          author: authorName,  // ✅ embedded author name inside ingestedAt
        },
      };

      readings.push(doc);
    }

    const result = await collection.insertMany(readings);
    console.log(`✅ Inserted ${result.insertedCount} IoT readings with author info into Readings collection`);
  } catch (err) {
    console.error("❌ Error inserting data:", err);
  } finally {
    await client.close();
  }
}

run();
