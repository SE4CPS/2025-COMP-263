/*
  lab5_migrate_map_reduce.js
  - Loads sql_sensors.json and sql_readings_100rows.json
  - Builds a lookup of sensors with reduce()
  - Transforms readings -> merged docs with map()
  - Computes checksum and shard id using reduce() and map()
  - Prints first 3 merged documents
  ONLY uses map(), reduce(), and filter() for transforms.
*/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function readJson(filename) {
  const raw = fs.readFileSync(path.resolve(__dirname, filename), 'utf8');
  return JSON.parse(raw);
}

function sha256Hex(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

// Load data
const sensors = readJson('sql_sensors.json'); // assumed an array of sensor rows
const readings = readJson('sql_readings_100rows.json'); // assumed an array of reading rows

// 1) Build a lookup map sensorId -> sensorRow using reduce()
const sensorsById = sensors.reduce((acc, s) => {
  // assume sensor object has sensor_id field; adapt if field name differs
  // normalize key to string
  acc[String(s.sensor_id)] = s;
  return acc;
}, {});

// 2) Function to compute shard id deterministically using only functional ops
// We'll compute a simple numeric shard: sum of char codes of deviceId % shardCount
const computeShardId = (deviceId, shardCount = 4) => {
  // split into chars and reduce to sum char codes (no loops)
  const sumCharCodes = deviceId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (sumCharCodes % shardCount) + 1; // shards numbered 1..shardCount
};

// 3) Create merged docs using map()
// Assumptions about schema:
// - a reading has sensor_id (matching sensor.sensor_id), timestamp as ts or ts_utc or reading_ts
// - sensor has device id as device_id or sensor_code; adapt field names if your JSON differs.

// We'll be tolerant about key names: check common alternatives
const getSensorField = (sensor, names) => {
  if (!sensor) return undefined;
  for (const n of names) if (sensor[n] !== undefined) return sensor[n];
  return undefined;
};

const getReadingField = (reading, names) => {
  for (const n of names) if (reading[n] !== undefined) return reading[n];
  return undefined;
};

// Transform
const merged = readings
  // optional filter to drop readings lacking sensor_id
  .filter(r => getReadingField(r, ['sensor_id', 'sensorId', 'sid']) !== undefined)
  .map(r => {
    const sidKey = String(getReadingField(r, ['sensor_id', 'sensorId', 'sid']));
    const sensor = sensorsById[sidKey];

    // build output following requested schema; pull fields from sensor + reading
    const deviceId = (getSensorField(sensor, ['device_id','deviceId','sensor_code','sensor_id']) || `SNS-${sidKey}`);
    const farmId = (getSensorField(sensor, ['farm_id','farmId']) || 'FARM-001');
    const crop = getSensorField(sensor, ['crop','crop_type']) || getReadingField(r, ['crop','crop_type']) || 'Unknown';

    // gps: attempt to get lat/lon from sensor, or fallbacks
    const lat = parseFloat(getSensorField(sensor, ['lat','latitude'])) || parseFloat(getReadingField(r, ['lat','latitude'])) || null;
    const lon = parseFloat(getSensorField(sensor, ['lon','longitude','lng'])) || parseFloat(getReadingField(r, ['lon','longitude','lng'])) || null;

    // timestamp: try common names, and make sure it's an ISO string
    const rawTs = getReadingField(r, ['ts_utc','timestamp','ts','time','reading_ts']) || new Date().toISOString();
    const ts_utc = (new Date(rawTs)).toISOString();

    // sensor measurements (try many possible keys)
    const soil_moisture = parseFloat(getReadingField(r, ['soil_moisture','soilMoisture','moisture'])) || null;
    const temp_c = parseFloat(getReadingField(r, ['temp_c','tempC','temperature','temp'])) || null;
    const battery_v = parseFloat(getReadingField(r, ['battery_v','battery','batteryV'])) || null;

    // build document
    const doc = {
      _id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
      farmId,
      deviceId,
      crop,
      gps: { lat, lon },
      ts_utc,
      soil_moisture,
      temp_c,
      battery_v,
      // metadata (lineage, checksum, created_at)
      metadata: {
        lineage: {
          source_files: ['sql_readings_100rows.json','sql_sensors.json'],
          sensor_lookup_key: sidKey
        },
        created_at: new Date().toISOString()
      }
    };

    // compute checksum for content (stable ordering)
    const checksumTarget = JSON.stringify(Object.keys(doc).sort().reduce((o,k)=>{
      o[k] = doc[k];
      return o;
    }, {}));
    const checksum = sha256Hex(checksumTarget);
    doc.metadata.checksum = checksum;

    // compute shard id using only functional reduce (on deviceId)
    doc.shard_id = computeShardId(deviceId, 4);

    return doc;
  });

// Print first 3 docs
console.log('--- Merged documents (first 3) ---\n');
merged.slice(0,3).forEach((d, i) => {
  console.log(`doc ${i+1}:`);
  console.log(JSON.stringify(d, null, 2));
  console.log('\n');
});

// Optionally write merged to a file
fs.writeFileSync(path.resolve(__dirname, 'merged_output.json'), JSON.stringify(merged, null, 2), 'utf8');
console.log('Wrote merged_output.json with', merged.length, 'documents.');
