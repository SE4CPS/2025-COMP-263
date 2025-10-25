const {MongoClient} = require("mongodb");

const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";

const dbName = "Project1";
const collectionName = "Readings";


async function insertSampleReadings() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const readings = db.collection(collectionName);
    console.log("db connected");


    const sampleData = [];

    for (let i = 1; i <= 50; i++) {
      const deviceId = `Nandusensor-${String(i).padStart(3, "0")}`;
      const farmId = `Nandufarm-${String(Math.ceil(i / 10)).padStart(2, "0")}`; 
      const tempC = +(20 + Math.random() * 10).toFixed(2); 
      const moisture = +(30 + Math.random() * 40).toFixed(2); 
      const humidity = +(40 + Math.random() * 30).toFixed(2); 

      const lat = +(37.0 + Math.random()).toFixed(6);
      const lon = +(-122.0 + Math.random()).toFixed(6);

      const timestamp = new Date(
        Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24)
      ).toISOString(); 
      const ingestedAt = new Date().toISOString();

      const note = `Auto-generated reading for ${deviceId}`;

      sampleData.push({
        deviceId,
        farmId,
        sensor: { tempC, moisture, humidity },
        gps: { lat, lon },
        note,
        timestamp,
        ingestedAt,
      });
    }

    const result = await readings.insertMany(sampleData);
    console.log(` Inserted ${result.insertedCount} IoT readings successfully.`);
  } catch (err) {
    console.error(" Error inserting readings:", err);
  } finally {
    await client.close();
  }
}

insertSampleReadings();

