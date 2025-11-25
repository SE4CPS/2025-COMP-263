const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Load input data
const sensorsPath = path.join(__dirname, "sql_sensors.json");
const readingsPath = path.join(__dirname, "sql_readings_100rows.json");

const sensors = JSON.parse(fs.readFileSync(sensorsPath, "utf8"));
const readings = JSON.parse(fs.readFileSync(readingsPath, "utf8"));

// ---------- Question 1: migrate + merge ----------

// Build lookup table for sensors by sensor_id
const sensorById = sensors.reduce((acc, row) => {
  acc[row.sensor_id] = row;
  return acc;
}, {});

// Join readings to sensors and build target JSON shape
const merged = readings.map((r) => {
  const s = sensorById[r.sensor_id] || {};

  return {
    _id: `${r.sensor_id}-${r.ts_utc}`,
    farmId: s.farm_id,
    deviceId: s.device_id,
    crop: s.crop,
    gps: {
      lat: s.lat,
      lon: s.lon,
    },
    ts_utc: r.ts_utc,
    soil_moisture: r.soil_moisture,
    temp_c: r.temp_c,
    battery_v: r.battery_v,
    sensorId: r.sensor_id,
  };
});

console.log("==== Q1: merged sample docs ====");
console.log(JSON.stringify(merged.slice(0, 3), null, 2));

// ---------- Question 2: enrich with metadata ----------

const syncTimeUtc = new Date().toISOString();
const batchId = `lab5_ram_${syncTimeUtc}`;

const enriched = merged.map((doc) => {
  const checksum = crypto
    .createHash("md5")
    .update(JSON.stringify(doc))
    .digest("hex");

  return {
    ...doc,
    metadata: {
      uuid: doc._id,
      checksum_md5: checksum,
      author: "Ram Mallineni",
      sync_time_utc: syncTimeUtc,
      source_db: "AgriSQL",
      source_tables: ["sql_sensors", "sql_readings_100rows"],
      ingest_batch_id: batchId,
      lineage: {
        sensor_pk: doc.sensorId,
        event_time_utc: doc.ts_utc,
      },
      units: {
        soil_moisture: "percent",
        temp_c: "celsius",
        battery_v: "volts",
      },
      quality_flags: {
        battery_low: doc.battery_v < 3.5,
        temperature_outlier: doc.temp_c < -5 || doc.temp_c > 50,
      },
    },
  };
});

console.log("==== Q2: enriched example doc ====");
console.dir(enriched[0], { depth: null });

// ---------- Question 3: shard the data ----------

const shards = enriched.reduce((acc, doc) => {
  const dayBucket = doc.ts_utc.slice(0, 10); // YYYY-MM-DD
  const shardName = `readings_${doc.farmId}_${dayBucket}`;
  const existing = acc[shardName] || [];
  acc[shardName] = existing.concat(doc);
  return acc;
}, {});

console.log("==== Q3: shard names and counts ====");
Object.entries(shards).forEach(([name, docs]) => {
  console.log(name, "->", docs.length);
});
