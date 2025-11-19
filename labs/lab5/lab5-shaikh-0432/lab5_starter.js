// lab5_starter.js

import crypto from "crypto";
import sensors from "./sql_sensors.js";
import readings from "./sql_readings.js";

// ---------- 1) Build lookup from sensors (reduce) ----------
const sensorLookup = sensors.reduce((acc, s) => {
  acc[s.sensor_id] = s;
  return acc;
}, {});

// for processing_time_ms
const startTime = Date.now();

// ---------- 2) Merge + add 15 metadata fields (map) ----------
const mergedDocs = readings
  .map((r) => {
    const sensor = sensorLookup[r.sensor_id];
    if (!sensor) return null;

    // main payload from SQL → NoSQL
    const rawDoc = {
      farmId: sensor.farm_id,
      deviceId: sensor.device_id,
      crop: sensor.crop,
      gps: { lat: sensor.lat, lon: sensor.lon },
      ts_utc: r.ts_utc,
      soil_moisture: r.soil_moisture,
      temp_c: r.temp_c,
      battery_v: r.battery_v,
    };

    // checksum for integrity
    const checksum_md5 = crypto
      .createHash("md5")
      .update(JSON.stringify(rawDoc))
      .digest("hex");

    // shard key = farm + date bucket (YYYY-MM-DD)
    const dateBucket = r.ts_utc.split("T")[0]; // e.g. "2025-11-01"
    const shardKey = `${sensor.farm_id}_${dateBucket}`;

    // 15 metadata fields
    const metadata = {
      uuid: crypto.randomUUID(), // 1
      checksum_md5,              // 2
      author: "Farheen",         // 3
      sync_time_utc: new Date().toISOString(), // 4
      source_db: "SQL",          // 5
      source_tables: ["sql_sensors", "sql_readings"], // 6
      ingest_batch_id: "BATCH-2025-11-16", // 7
      version: "1.0.0",          // 8
      lineage: {                 // 9
        sensor_id: r.sensor_id,
        farm_id: sensor.farm_id,
      },
      units: {                   // 10
        soil_moisture: "%",
        temp_c: "C",
        battery_v: "V",
      },
      quality_flags: {           // 11
        isValid: r.soil_moisture >= 0 && r.temp_c <= 60,
        missingValues: false,
      },
      createdAt: new Date().toISOString(), // 12
      updatedAt: new Date().toISOString(), // 13
      processing_time_ms: Date.now() - startTime, // 14
      shardKey,                 // 15
    };

    return {
      _id: crypto.randomUUID(),
      metadata,
      raw: rawDoc,
    };
  })
  .filter((doc) => doc !== null);

// ---------- 3) Show a couple of enriched docs (for Q1/Q2 screenshot) ----------
console.log("Sample enriched docs:\n");
console.log(JSON.stringify(mergedDocs.slice(0, 2), null, 2));

// ---------- 4) Shard data using reduce() (Q3) ----------
const shards = mergedDocs.reduce((acc, doc) => {
  const key = doc.metadata.shardKey;
  if (!acc[key]) {
    acc[key] = [];
  }
  acc[key].push(doc);
  return acc;
}, {});

// print shard summary (for Q3 screenshot)
console.log("\nShard Summary:\n");
Object.keys(shards).forEach((shardName) => {
  console.log(`Shard: ${shardName} → ${shards[shardName].length} docs`);
});