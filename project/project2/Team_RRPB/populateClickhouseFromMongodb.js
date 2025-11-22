const { MongoClient } = require("mongodb");
const { createClient } = require("@clickhouse/client");
require("dotenv").config();

const URI = process.env.MONGODB_URI;
const DB = process.env.MONGO_DB;
const ENR_COL = process.env.MONGO_ENR_COLL;
const CLKHOUSE_URL = process.env.CLICKHOUSE_URL;

const clickhouse = createClient({
  url: CLKHOUSE_URL || "http://localhost:8123"
});

async function transfer() {
  const mongoClient = new MongoClient(URI);

  try {
    await mongoClient.connect();
    console.log("MongoDB connected.");

    const db = mongoClient.db(DB);
    const col = db.collection(ENR_COL);

    const data = await col.find({
        "metadata.author": "Team RRPB"
    }).toArray();
    console.log(`Fetched ${data.length} records from MongoDB.`);

    if (data.length === 0) {
      console.log("No data found. Exiting.");
      return;
    }

    const rows = data.map(doc => ({
        "time": doc.data.time.replace("T", " ") + ":00",
        "temperature": doc.data.temperature,
        "rain": doc.data.rain,
        "relative_humidity": doc.data.relative_humidity,
        "soil_temperature": doc.data.soil_temperature,
        "soil_moisture": doc.data.soil_moisture
    }));

    console.log(rows[0].time);

    await clickhouse.insert({
      table: "weather_hourly",
      values: rows,
      format: "JSONEachRow",
    });

    console.log("Data successfully inserted into ClickHouse.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoClient.close();
    await clickhouse.close();
  }
}

// Run it
transfer();
