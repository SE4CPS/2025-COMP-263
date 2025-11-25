const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const sensorsFile = path.join(__dirname, "sql_sensors.json");
const readingsFile = path.join(__dirname, "sql_readings_100rows.json");

const sensorRows = JSON.parse(fs.readFileSync(sensorsFile, "utf8"));
const readingRows = JSON.parse(fs.readFileSync(readingsFile, "utf8"));

// ---------- Q1: migrate + merge using functional style ----------

const sensorIndex = sensorRows.reduce(
  (lookup, s) => Object.assign(lookup, { [s.sensor_id]: s }),
  {}
);

const joined = readingRows.map((r) => {
  const sensor = sensorIndex[r.sensor_id] || {};

  const baseDoc = {
    sensor_id: r.sensor_id,
    ts_utc: r.ts_utc,
    soil_moisture: r.soil_moisture,
    temp_c: r.temp_c,
    battery_v: r.battery_v,
  };

  const locationDoc = {
    farmId: sensor.farm_id,
    deviceId: sensor.device_id,
    crop: sensor.crop,
    gps: { lat: sensor.lat, lon: sensor.lon },
  };

  const idSource = `${r.sensor_id}|${r.ts_utc}`;
  const syntheticId = crypto.createHash("md5").update(idSource).digest("hex");

  return {
    _id: syntheticId,
    ...locationDoc,
    ...baseDoc,
  };
});

console.log("==== Q1: first merged docs ====");
console.log(JSON.stringify(joined.slice(0, 3), null, 2));

// ---------- Q2: add metadata with map() ----------

const jobRunTime = new Date().toISOString();
const jobRunId = `manne_lab5_${Date.now()}`;
const pipelineVersion = "v1.0";

const enrichedSai = joined.map((doc) => {
  const payloadChecksum = crypto
    .createHash("md5")
    .update(JSON.stringify(doc))
    .digest("hex");

  const measurementUnits = {
    soil_moisture: "pct",
    temp_c: "degC",
    battery_v: "V",
  };

  const quality = {
    low_battery: doc.battery_v <= 3.4,
    extreme_temperature: doc.temp_c <= -10 || doc.temp_c >= 55,
  };

  return {
    ...doc,
    meta: {
      record_uuid: doc._id,
      checksum_md5: payloadChecksum,
      created_by: "Sai Manne",
      created_at_utc: jobRunTime,
      source_system: "FarmSensorSQL",
      source_tables: "sql_sensors + sql_readings_100rows",
      pipeline_version: pipelineVersion,
      job_name: "lab5_ingest",
      job_run_id: jobRunId,
      measurement_units: measurementUnits,
      data_quality: quality,
    },
  };
});

console.log("==== Q2: enriched example ====");
console.dir(enrichedSai[0], { depth: null });

// ---------- Q3: sharding strategy ----------

const shardBuckets = enrichedSai.reduce((acc, doc) => {
  const day = doc.ts_utc.substring(0, 10);
  const shardKey = `farm_${doc.farmId}_dev_${doc.deviceId}_${day}`;
  const bucket = acc[shardKey] || [];
  acc[shardKey] = bucket.concat(doc);
  return acc;
}, {});

console.log("==== Q3: shard list ====");
Object.keys(shardBuckets).forEach((name) => {
  console.log(name, "->", shardBuckets[name].length);
});
