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

    const start = Date.now();

    await clickhouse.insert({
      table: "weather_hourly",
      values: rows,
      format: "JSONEachRow",
    });

    const end = Date.now();

    const loadTimeMs = end-start;

    console.log("Data successfully inserted into ClickHouse.");
    console.log(`Data inserted into ClickHouse in ${loadTimeMs} ms.`);

    const updateResult = await col.updateMany(
      { "metadata.author": "Team RRPB" },
      {
        $set: {
          "metadata.warehouse_load_time": loadTimeMs,
          "metadata.load_mode": "incremental"
        }
      }
    );
    
    console.log(`Updated ${updateResult.modifiedCount} MongoDB docs with load metadata.`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoClient.close();
    await clickhouse.close();
  }
}

// Run it
transfer();
