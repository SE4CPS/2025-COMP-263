/**
 * Lab 5 — SQL → NoSQL (Map/Filter/Reduce ONLY)
 * FINAL SOLUTION — 
 */

const fs = require('fs');
const crypto = require('crypto');

// ---------- helpers ----------
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const randomUUID = () => crypto.randomUUID();
const pick = (obj, keys) =>
  keys.reduce((o, k) => (obj[k] !== undefined ? ((o[k] = obj[k]), o) : o), {});
const toIndex = (arr, keyFn) =>
  arr.reduce((acc, x) => ((acc[keyFn(x)] = x), acc), {});

// ---------- load data ----------
const sensorsRaw  = readJson('./sql_sensors.json');
const readingsRaw = readJson('./sql_readings_100rows.json');

// ---------- normalize ----------
const normSensor = (s) => ({
  sensor_id: s.sensor_id ?? s.sensorId ?? s.id,
  device_id: s.device_id ?? s.deviceId,
  farm_id:   s.farm_id   ?? s.farmId,
  crop:      s.crop,
  lat:       s.lat ?? s.latitude,
  lon:       s.lon ?? s.longitude,
  model:     s.model,
  __raw: s
});

const normReading = (r) => ({
  reading_id:    r.reading_id ?? r.id,
  sensor_id:     r.sensor_id ?? r.sensorId,
  ts_utc:        r.ts_utc ?? r.ts ?? r.timestamp,
  soil_moisture: Number(r.soil_moisture ?? r.value),
  temp_c:        Number(r.temp_c ?? r.temperature_c ?? r.temperature),
  battery_v:     Number(r.battery_v ?? r.batt_v),
  __raw: r
});

const SENSORS  = sensorsRaw.map(normSensor).filter(s => s.sensor_id !== undefined);
const READINGS = readingsRaw.map(normReading).filter(r => r.sensor_id !== undefined && r.ts_utc);

// ------------------------------------------------------------
//  — MERGE USING MAP() + FILTER()
// ------------------------------------------------------------

const sensorById = toIndex(SENSORS, (s) => String(s.sensor_id));

const mergedDocs = READINGS
  .map(r => {
    const s = sensorById[String(r.sensor_id)];
    if (!s) return null;

    return {
      _id: randomUUID(),
      farmId: s.farm_id,
      deviceId: s.device_id,
      crop: s.crop,
      gps: {
        lat: s.lat,
        lon: s.lon
      },
      ts_utc: r.ts_utc,
      soil_moisture: r.soil_moisture,
      temp_c: r.temp_c,
      battery_v: r.battery_v
    };
  })
  .filter(Boolean);

// Print sample for screenshot
console.log("sample_merged_first3:", JSON.stringify(mergedDocs.slice(0,3), null, 2));


// ------------------------------------------------------------
// — ADD ≥10 METADATA FIELDS
// ------------------------------------------------------------

const enrichedDocs = mergedDocs.map(doc => {
  // Compute checksum
  const payload = JSON.stringify({
    farmId: doc.farmId,
    deviceId: doc.deviceId,
    ts_utc: doc.ts_utc,
    soil_moisture: doc.soil_moisture,
    temp_c: doc.temp_c,
    battery_v: doc.battery_v
  });

  const checksum_md5 = crypto
    .createHash("md5")
    .update(payload)
    .digest("hex");

  // Add 10+ metadata fields
  const metadata = {
    uuid: doc._id,
    checksum_md5,
    author: "student",
    sync_time_utc: new Date().toISOString(),
    source_db: "legacy_sql_server",
    source_tables: ["sql_sensors", "sql_readings"],
    ingest_batch_id: "batch_" + Date.now(),
    lineage: `${doc.deviceId}/${doc.ts_utc}`,
    units: {
      soil_moisture: "%",
      temp_c: "°C",
      battery_v: "V"
    },
    quality_flags: {
      missing_values: false,
      anomaly_detected: false
    }
  };

  return { ...doc, metadata };
});

console.log("sample_enriched:", JSON.stringify(enrichedDocs[0], null, 2));



// ------------------------------------------------------------
// — SHARD USING REDUCE()
// ------------------------------------------------------------

// const toDay = (iso) => iso.slice(0, 10);

// const shards = enrichedDocs.reduce((acc, d) => {
//   const day = toDay(d.ts_utc);
//   const shardName = `readings_${d.farmId}_${day}`;
//   acc[shardName] = acc[shardName]
//     ? acc[shardName].concat([d])
//     : [d];
//   return acc;
// }, {});

// // Prepare summary
// const shardSummary = Object.keys(shards)
//   .sort()
//   .map(name => ({ shard: name, count: shards[name].length }));

// console.log("shards:", JSON.stringify(shardSummary, null, 2));

// // Optional final summary
// console.log("summary:", JSON.stringify({
//   inputs: { sensors: SENSORS.length, readings: READINGS.length },
//   outputs: { merged_docs: mergedDocs.length, shards: shardSummary.length }
// }, null, 2));

// ---------- TODO(Q3): Shard with reduce (partition by farmId+day) ----
const toDay = (iso) => iso.slice(0,10);

const shards = enrichedDocs.reduce((acc, d) => {
  const day = toDay(d.ts_utc);                       // Extract YYYY-MM-DD
  const shardName = `readings_${d.farmId}_${day}`;   // farmId + day shard key

  acc[shardName] = acc[shardName]
    ? acc[shardName].concat([d])
    : [d];

  return acc;
}, {});

// Build summary array
const shardSummary = Object.keys(shards)
  .sort()
  .map(name => ({ shard: name, count: shards[name].length }));

console.log("shards:", JSON.stringify(shardSummary, null, 2));
console.log("total_count:", shardSummary.reduce((sum, x) => sum + x.count, 0));

