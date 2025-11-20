/**
 * Lab 5 — SQL → NoSQL (Map/Filter/Reduce ONLY)
 * Starter skeleton for students (Q1: merge, Q2: metadata, Q3: sharding).
 * Constraints: No for/while/for..of loops. No external libraries.
 *
 * Files provided:
 *  - sql_sensors.json
 *  - sql_readings_100rows.json
 *
 * Expected deliverables (printed to console):
 *  Q1: `sample_merged_first3` (2–3 merged docs with exact schema)
 *  Q2: `sample_enriched` (one merged doc showing ≥10 metadata fields)
 *  Q3: `shards` (array of { shard, count } partitioned by farmId+day)
 */

const fs = require('fs');
const crypto = require('crypto');

// ---------- helpers (students may use; do not modify) ----------
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
const randomUUID = () => crypto.randomUUID();
const pick = (obj, keys) =>
  keys.reduce((o, k) => (obj[k] !== undefined ? ((o[k] = obj[k]), o) : o), {});
const toIndex = (arr, keyFn) =>
  arr.reduce((acc, x) => ((acc[keyFn(x)] = x), acc), {}); // reduce only

// ---------- load inputs ----------
const sensorsRaw  = readJson('./sql_sensors.json');
const readingsRaw = readJson('./sql_readings_100rows.json');

/*
  EXPECTED SHAPES (as provided):
  sensors:  { sensor_id, device_id, farm_id, crop, lat, lon, model, ... }
  readings: { reading_id, sensor_id, ts_utc, soil_moisture, temp_c, battery_v, ... }
*/

// ---------- (1) Normalize / sanity (small, predictable) ----------
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

// ---------- TODO(Q1): Join & merge with EXACT schema -----------------
/**
 * REQUIRED merged document shape for Q1:
 * {
 *   _id: "uuid",
 *   farmId: "FARM-001",
 *   deviceId: "SNS-1042",
 *   crop: "Almond",
 *   gps: { lat: 37.95, lon: -121.29 },
 *   ts_utc: "2025-11-01T06:13:00Z",
 *   soil_moisture: 33.2,
 *   temp_c: 21.3,
 *   battery_v: 3.9
 * }
 *
 * Rules:
 *  - Use only map/filter/reduce to build the merged array
 *  - Join on sensor_id (READINGS -> SENSORS)
 *  - Skip orphans (readings without a matching sensor)
 */

const sensorById = toIndex(SENSORS, (s) => String(s.sensor_id));

const mergedDocs = READINGS
  .map(r => {
    const s = sensorById[String(r.sensor_id)];
    if (!s) return null;

    const coreDoc = {
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

    return coreDoc;
  })
  .filter(Boolean);

// Print first 2–3 docs for Q1 screenshot
console.log('sample_merged_first3:', JSON.stringify(mergedDocs.slice(0,3), null, 2));

// ---------- TODO(Q2): Enrich with ≥10 metadata fields ----------------
/**
 * Add a `metadata` object with AT LEAST these fields:
 *  uuid (same as _id), checksum_md5, author, sync_time_utc,
 *  source_db, source_tables, ingest_batch_id, lineage, units, quality_flags
 * (You may include extras: record_source, transform_status, etc.)
 *
 * HINT:
 *  - compute checksum over a stable subset of fields (e.g., farmId, deviceId, ts_utc, soil_moisture, temp_c, battery_v)
 *  - lineage idea: `${deviceId}/${reading_id}`
 */
const enrichedDocs = mergedDocs.map(doc => {
  const payload = JSON.stringify(pick(doc, ['farmId','deviceId','ts_utc','soil_moisture','temp_c','battery_v']));
  const checksum_md5 = crypto.createHash('md5').update(payload).digest('hex');

  const metadata = {
    uuid: doc._id,
    checksum_md5: checksum_md5,
    author: "Lab5_Darshana",
    sync_time_utc: new Date().toISOString(),
    source_db: "sql_agriculture_db",
    source_tables: ["sql_sensors", "sql_readings"],
    ingest_batch_id: "BATCH-2025-11-19",
    lineage: `${doc.deviceId}/${doc.ts_utc}`,
    units: {
      soil_moisture: "percentage",
      temp_c: "celsius",
      battery_v: "volts"
    },
    quality_flags: {
      validated: true,
      complete: true,
      anomaly_detected: false
    }
  };

  return { ...doc, metadata };
});

// Print one enriched doc for Q2 screenshot
console.log('sample_enriched:', JSON.stringify(enrichedDocs[0], null, 2));

// (Optional) write merged to file for your own checking
// writeJson('./out_merged.json', enrichedDocs);

// ---------- TODO(Q3): Shard with reduce (partition by farmId+day) ----
/**
 * Partition into shards named: readings_<farmId>_<YYYY-MM-DD>
 * Use reduce() to create an object: { shardName: [docs...] }
 * Then print a summary: [{ shard, count }, ...]
 */
const toDay = (iso) => (typeof iso === 'string' ? iso.slice(0,10) : 'UNKNOWN');

const shards = enrichedDocs.reduce((acc, d) => {
  const shardName = `readings_${d.farmId}_${toDay(d.ts_utc)}`;
  acc[shardName] = acc[shardName] ? acc[shardName].concat([d]) : [d];
  return acc;
}, {});

// Build summary array for console screenshot
const shardSummary = Object.keys(shards)
  .sort()
  .map(name => ({ shard: name, count: shards[name].length }));

console.log('shards:', JSON.stringify(shardSummary, null, 2));

// Final light summary (optional)
const summary = {
  inputs: { sensors: SENSORS.length, readings: READINGS.length },
  outputs: { merged_docs: mergedDocs.length, shards: shardSummary.length }
};
console.log('summary:', JSON.stringify(summary, null, 2));