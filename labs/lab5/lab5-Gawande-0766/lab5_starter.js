/**
 * Lab 5 — SQL → NoSQL (Map/Filter/Reduce ONLY)
 */

const fs = require('fs');
const crypto = require('crypto');

// helpers
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
const randomUUID = () => crypto.randomUUID();
const pick = (obj, keys) =>
  keys.reduce((o, k) => (obj[k] !== undefined ? ((o[k] = obj[k]), o) : o), {});
const toIndex = (arr, keyFn) =>
  arr.reduce((acc, x) => ((acc[keyFn(x)] = x), acc), {}); 

// ---------- load inputs ----------
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

// ---------- Q1: Merge (JOIN) ----------
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
      gps: { lat: s.lat, lon: s.lon },
      ts_utc: r.ts_utc,
      soil_moisture: r.soil_moisture,
      temp_c: r.temp_c,
      battery_v: r.battery_v
    };
  })
  .filter(Boolean);

console.log("sample_merged_first3:", JSON.stringify(mergedDocs.slice(0,3), null, 2));

// ---------- Q2: Enrich Metadata ----------
/*const enrichedDocs = mergedDocs.map(doc => {
  const payload = JSON.stringify(
    pick(doc, ["farmId", "deviceId", "ts_utc", "soil_moisture", "temp_c", "battery_v"])
  );

  const checksum_md5 = crypto.createHash("md5").update(payload).digest("hex");

  const metadata = {
    uuid: doc._id,
    checksum_md5,
    author: "Utkarsh",
    sync_time_utc: new Date().toISOString(),
    source_db: "SQL-MYSQL",
    source_tables: ["sensors", "readings"],
    ingest_batch_id: "batch-001",
    lineage: `${doc.deviceId}/${doc.ts_utc}`,
    units: { soil_moisture: "%", temp_c: "C", battery_v: "V" },
    quality_flags: { missing: false, range_ok: true },
    // extra fields allowed:
    record_source: "ETL v1",
    transform_status: "OK"
  };

  return { ...doc, metadata };
});*/
const enrichedDocs = mergedDocs.map(doc => {
  // checksum over selected fields
  const payload = JSON.stringify(
    pick(doc, ["farmId", "deviceId", "ts_utc", "soil_moisture", "temp_c", "battery_v"])
  );

  const checksum_md5 = crypto.createHash("md5")
    .update(payload)
    .digest("hex");

  const metadata = {
    uuid: doc._id,
    checksum_md5,
    author: "Utkarsh",                  // you can put your name
    sync_time_utc: new Date().toISOString(),
    source_db: "SQL-MYSQL",
    source_tables: ["sensors", "readings"],
    ingest_batch_id: "batch-001",
    lineage: `${doc.deviceId}/${doc.ts_utc}`,
    units: {
      soil_moisture: "%",
      temp_c: "C",
      battery_v: "V"
    },
    quality_flags: {
      range_ok: true,
      missing: false
    }
  };

  return { ...doc, metadata };
});


console.log("sample_enriched:", JSON.stringify(enrichedDocs[0], null, 2));

// ---------- Q3: Sharding ----------
/*const toDay = (iso) => (typeof iso === "string" ? iso.slice(0,10) : "UNKNOWN");

const shards = enrichedDocs.reduce((acc, d) => {
  const shardName = `readings_${d.farmId}_${toDay(d.ts_utc)}`;
  acc[shardName] = acc[shardName] ? acc[shardName].concat([d]) : [d];
  return acc;
}, {});

const shardSummary = Object.keys(shards)
  .sort()
  .map(name => ({ shard: name, count: shards[name].length }));*/

  const toDay = (iso) => (typeof iso === 'string' ? iso.slice(0,10) : 'UNKNOWN');

const shards = enrichedDocs.reduce((acc, d) => {
  // shard key = farmId + date bucket ('YYYY-MM-DD')
  const dayBucket = toDay(d.ts_utc);
  const shardName = `readings_${d.farmId}_${dayBucket}`;

  acc[shardName] = acc[shardName]
    ? acc[shardName].concat([d])
    : [d];

  return acc;
}, {});

const shardSummary = Object.keys(shards)
  .sort()
  .map(name => ({
    shard: name,
    count: shards[name].length
  }));

console.log("shards:", JSON.stringify(shardSummary, null, 2));

console.log("summary:", JSON.stringify({
  inputs: { sensors: SENSORS.length, readings: READINGS.length },
  outputs: { merged_docs: mergedDocs.length, shards: shardSummary.length }
}, null, 2));

