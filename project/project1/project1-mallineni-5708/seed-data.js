const { MongoClient } = require("mongodb");

const uri =
  "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const client = new MongoClient(uri);

async function seedData() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    const database = client.db("Project1");
    const collection = database.collection("Readings");

    const readings = [];
    const sensors = [
      "sensor-001",
      "sensor-002",
      "sensor-003",
      "sensor-004",
      "sensor-005",
    ];
    const farms = ["farm-01", "farm-02", "farm-03", "farm-04"];

    for (let i = 0; i < 50; i++) {
      const timestamp = new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      );

      const reading = {
        deviceId: sensors[Math.floor(Math.random() * sensors.length)],
        farmId: farms[Math.floor(Math.random() * farms.length)],
        sensor: {
          tempC: parseFloat((Math.random() * 30 + 10).toFixed(2)),
          moisture: parseFloat((Math.random() * 100).toFixed(2)),
          humidity: parseFloat((Math.random() * 100).toFixed(2)),
        },
        gps: {
          lat: parseFloat((Math.random() * 180 - 90).toFixed(6)),
          lon: parseFloat((Math.random() * 360 - 180).toFixed(6)),
        },
        note: `Sample reading ${i + 1}`,
        timestamp: timestamp.toISOString(),
        ingestedAt: new Date().toISOString(),
        author: "Ram Mallineni",
      };
      readings.push(reading);
    }

    const result = await collection.insertMany(readings);
    console.log(`${result.insertedCount} documents inserted successfully`);
    console.log("Sample document:", readings[0]);
  } catch (error) {
    console.error("Error:", error.message);
    if (error.writeErrors) {
      console.error(
        "Validation error details:",
        error.writeErrors[0].err.errInfo
      );
    }
  } finally {
    await client.close();
  }
}

seedData();
