const { MongoClient } = require("mongodb");
require("dotenv").config();

const URI = process.env.MONGODB_URI;
const DB = process.env.MONGO_DB;
const RAW_COL = process.env.MONGO_RAW_COLL;
const ENR_COL = process.env.MONGO_ENR_COLL;

async function getData(){
    try {
        const params = new URLSearchParams({
            latitude: 37.9577,
            longitude: -121.2908,
            start_date: "2024-11-18",
            end_date: "2025-11-13",
            hourly: "temperature_2m,relative_humidity_2m,rain,soil_temperature_7_to_28cm,soil_moisture_7_to_28cm",
            timezone: "America/Los_Angeles"
        });

        const url = `https://archive-api.open-meteo.com/v1/archive?${params}`;

        const res = await fetch(url);
        const data = await res.json();

        return data;
    }
    catch(err) {
        console.log(err);
    }
}

function transformToRowDocs(apiData, metadata) {
  const times = apiData.hourly.time;
  const temps = apiData.hourly.temperature_2m;
  const rains = apiData.hourly.rain;
  const relative_humidity = apiData.hourly.relative_humidity_2m;
  const soil_temperature = apiData.hourly.soil_temperature_7_to_28cm;
  const soil_moisture = apiData.hourly.soil_moisture_7_to_28cm;

  return times.map((t, i) => ({
    time: t,
    temperature: temps[i],
    rain: rains[i],
    relative_humidity: relative_humidity[i],
    soil_temperature: soil_temperature[i],
    soil_moisture: soil_moisture[i],
    metadata
  }));
}


async function saveRaw(client, rowDocs) {
  const db = client.db(DB);
  const rawCol = db.collection(RAW_COL);

  const merged = rowDocs.map(doc => {

    const { metadata, ...data } = doc;

    return {
      ...data,
      ...metadata,
    }
  });

  const result = await rawCol.insertMany(merged);

  return Object.values(result.insertedIds);
}


async function saveEnriched(client, rowDocs, rawIds) {
  const db = client.db(DB);
  const enrichedCol = db.collection(ENR_COL);
  const api_request_id = crypto.randomUUID();

  const enrichedDocs = rowDocs.map((doc, i) => {

    const { metadata, ...data } = doc;

    return {
      rawId: rawIds[i],
      data: {
        ...data
      },
      metadata: {
        ...metadata,
        source_timestamp: new Date(),
        source_database: "Open-Meteo",
        data_quality: "Highly Reliable",
        api_request_id: api_request_id,
        ingestedAt: new Date(),
        transform_status: "Enriched",
        sync_type: "Full"
      }
    };
  });

  await enrichedCol.insertMany(enrichedDocs);
}


async function runPipeline() {
  const apiData = await getData();

  const metadata = {
    author: "Team RRPB",
    city: "Stockton",
    state: "CA",
    latitude: apiData.latitude,
    longitude: apiData.longitude,
    timezone: 'America/Los_Angeles',
    timezoneAbbr: "GMT-8",
    units: apiData.hourly_units,
  };

  const rowDocs = transformToRowDocs(apiData, metadata);

  console.log(rowDocs);

  const client = new MongoClient(URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const rawIds = await saveRaw(client, rowDocs);
    await saveEnriched(client, rowDocs, rawIds);

    console.log("Raw + Enriched documents inserted successfully");
  } catch (err) {
    console.error("Pipeline error:", err);
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}


runPipeline();



