const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://i40:dbms2@cluster0.lixbqmp.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();

    const db = client.db("AgriDB");
    const readings = db.collection("readings");

    const docs = [];
    for (let i = 1; i <= 2000; i++) {
      docs.push({
        sensorId: `sensor-${(i % 50) + 1}`,
        reading: Number((Math.random() * 100).toFixed(2)),
        unit: "Celsius",
        updatedAt: new Date().toISOString(),
        meta: {
          author: "Rohan Jagdish Tilwani"
        }
      });
    }

    const result = await readings.insertMany(docs);
    console.log(`Inserted ${result.insertedCount} documents into AgriDB.readings`);
  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    await client.close();
  }
}

run();
