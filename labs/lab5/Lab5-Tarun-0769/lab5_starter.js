/**
 * Lab 5 — SQL → NoSQL (Map/Filter/Reduce ONLY)
 * Rewritten clean version — same logic, same output.
 * Author updated to Tarun.
 */

const fs = require('fs');
const crypto = require('crypto');
const { randomUUID } = require('crypto');

// ---------- simple JSON IO ----------
const readJson  = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const writeJson = (path, data) =>
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');

// ---------- functional helpers ----------
const toIndex = (arr, keyFn) =>
  arr.reduce((acc, x) => ((acc[keyFn(x)] = x), acc), {});

const pick = (obj, keys) =>
  keys.reduce(
    (out, k) => (obj[k] !== undefined ? ((out[k] = obj[k]), out) : out),
    {}
  );

// ---------- load raw inputs ----------
const sensorsRaw  = readJson('./sql_sensors.json');
const readingsRaw = readJson('./sql_readings_100rows.json');

// ---------- normalization ----------
const normalizeSensor = (s) => ({
  sensor_id: s.sensor_id ?? s.sensorId ?? s.id,
  device_id: s.device_id ?? s.deviceId,
  farm_id:   s.farm_id   ?? s.farmId,
  crop:      s.crop,
  lat:       s.lat ?? s.latitude,
  lon:       s.lon ?? s.longitude,
  model:     s.model,
  __raw:     s
});

const normalizeReading = (r) => ({
  reading_id:    r.reading_id ?? r.id,
  sensor_id:     r.sensor_id ?? r.sensorId,
  ts_utc:        r.ts_utc ?? r.ts ?? r.timestamp,
  soil_moisture: Number(r.soil_moisture ?? r.value),
  temp_c:        Number(r.temp_c ?? r.temperature_c ?? r.temperature),
  battery_v:     Number(r.battery_v ?? r.batt_v),
  __raw:         r
});

const SENSORS = sensorsRaw
  .map(normalizeSensor)
  .filter((s) => s.sensor_id !== undefined);

const READINGS = readingsRaw
  .map(normalizeReading)
  .filter((r) => r.sensor_id !== undefined && r.ts_utc);

// ---------- Q1: merge (join by sensor_id) ----------
const sensorsById = toIndex(SENSORS, (s) => String(s.sensor_id));

const mergedDocs = READINGS.map((r) => {
  const s = sensorsById[String(r.sensor_id)];
  if (!s) return null;

  // core document required by the lab spec
  const baseDoc = {
    _id: randomUUID(),
    farmId: s.farm_id,
    deviceId: s.device_id,
    crop: s.crop,
    gps: { lat: s.lat, lon: s.lon },
    ts_utc: r.ts_utc,
    soil_moisture: r.soil_moisture,
    temp_c: r.temp_c,
    battery_v: r.battery_v
  };

  // Q2: metadata (10+ fields)
  const md5Payload = JSON.stringify(
    pick(baseDoc, ['farmId', 'deviceId', 'ts_utc', 'soil_moisture', 'temp_c', 'battery_v'])
  );

  const metadata = {
    uuid: baseDoc._id,
    author: 'Tarun',                                      // updated
    sync_time_utc: new Date().toISOString(),
    source_db: 'lab5-sql-json-sim',
    source_tables: ['sql_readings_100rows', 'sql_sensors'],
    ingest_batch_id: `batch_${Date.now()}`,
    lineage: `${s.device_id}/${r.reading_id}`,
    units: { soil_moisture: '%', temp_c: 'C', battery_v: 'V' },
    quality_flags: [],
    checksum_md5: crypto.createHash('md5').update(md5Payload).digest('hex'),
    record_source: 'lab5_sql_to_nosql',
    transform_status: 'merged'
  };

  return { ...baseDoc, metadata };
}).filter(Boolean);

// write merged output
writeJson('./out_merged.json', mergedDocs);

// preview samples
console.log(
  'sample_merged_first3:',
  JSON.stringify(mergedDocs.slice(0, 3), null, 2)
);
console.log(
  'sample_enriched:',
  JSON.stringify(mergedDocs[0], null, 2)
);

// ---------- Q3: sharding by (farmId + day) ----------
const toDay = (iso) => (typeof iso === 'string' ? iso.slice(0, 10) : 'UNKNOWN');

const shards = mergedDocs.reduce((acc, doc) => {
  const name = `readings_${doc.farmId}_${toDay(doc.ts_utc)}`;
  acc[name] = acc[name] ? acc[name].concat([doc]) : [doc];
  return acc;
}, {});

// shard index summary
const shardSummary = Object.keys(shards)
  .sort()
  .map((name) => ({ shard: name, count: shards[name].length }));

writeJson('./out_shard_index.json', shardSummary);
console.log('shards:', JSON.stringify(shardSummary, null, 2));

// ---------- final summary ----------
const finalSummary = {
  inputs: { sensors: SENSORS.length, readings: READINGS.length },
  outputs: { merged_docs: mergedDocs.length, shards: shardSummary.length }
};

console.log('summary:', JSON.stringify(finalSummary, null, 2));
