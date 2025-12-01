// etl_api_to_mongo.js
const fs = require('fs');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const MONGO_DB = process.env.MONGO_DB || 'stockton_weather';
const RAW_COL = process.env.MONGO_COLLECTION_RAW || 'stockton_daily_raw';
const DAILY_COL = process.env.MONGO_COLLECTION_DAILY || 'stockton_daily_enriched';

async function main() {
    const file = './latest_open_meteo.json';
    if (!fs.existsSync(file)) {
        throw new Error('latest_open_meteo.json not found. Run npm run fetch-api first.');
    }

    const { payload, metadata } = JSON.parse(fs.readFileSync(file, 'utf8'));

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(MONGO_DB);

    const rawColl = db.collection(RAW_COL);
    const dailyColl = db.collection(DAILY_COL);

    // clear for clean reruns
    await rawColl.deleteMany({});
    await dailyColl.deleteMany({});

    // 1 raw document
    await rawColl.insertOne({
        _id: metadata.etl_batch_id,
        payload,
        metadata
    });

    const daily = payload.daily;
    const docs = daily.time.map((dateStr, idx) => ({
        date: dateStr, // 'YYYY-MM-DD'
        max_temp_c: daily.temperature_2m_max[idx],
        min_temp_c: daily.temperature_2m_min[idx],
        precip_mm: daily.precipitation_sum[idx],
        location_city: 'Stockton',
        location_state: 'CA',
        latitude: payload.latitude,
        longitude: payload.longitude,
        source: 'open-meteo',
        etl_batch_id: metadata.etl_batch_id,
        ingest_time_utc: metadata.source_timestamp
    }));

    const result = await dailyColl.insertMany(docs);

    console.log(
        `Inserted 1 raw and ${result.insertedCount} enriched docs into MongoDB`
    );

    await client.close();
}

main().catch(err => {
    console.error('Error in etl_api_to_mongo:', err);
    process.exit(1);
});
