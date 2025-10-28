const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";

async function run() {
  const client = new MongoClient(uri);

  try {
    console.log("Connecting to MongoDB Atlas...");
    await client.connect();
    console.log("Connected successfully!");
    
    const db = client.db("Project1");
    const collection = db.collection("Readings");
    console.log("Using database: Project1, collection: Readings");

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
        note: "auto-generated IoT reading",
        author: "Darshana Patil",
        timestamp: new Date().toISOString(),
        ingestedAt: new Date().toISOString()
      });
    }

    console.log(`Generated ${readings.length} readings. Inserting into database...`);
    const result = await collection.insertMany(readings);
    console.log(`${result.insertedCount} readings inserted successfully! `);
    
    // Show a sample document
    console.log("\nSample document:");
    console.log(JSON.stringify(readings[0], null, 2));
  } catch (err) {
    console.error("Error inserting data:", err);
  } finally {
    await client.close();
  }
}

run();