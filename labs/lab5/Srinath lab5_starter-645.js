/**
 * Lab 5 — SQL → NoSQL (Map/Filter/Reduce ONLY)
 * Satisfies Q1 (merge schema), Q2 (10+ metadata), Q3 (sharding by farmId+day).
 * No external libraries. No for/while/for..of loops.
 */

const fs = require('fs');
const crypto = require('crypto');
const { randomUUID } = require('crypto');

// ---------- tiny io helpers ----------
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');

// ---------- functional helpers (no loops) ----------
const toIndex = (arr, keyFn) =>
    arr.reduce((acc, x) => ((acc[keyFn(x)] = x), acc), {});

const groupBy = (arr, keyFn) =>
    arr.reduce((acc, x) => {
        const k = keyFn(x);
        acc[k] = acc[k] ? acc[k].concat([x]) : [x];
        return acc;
    }, {});

const pick = (obj, keys) =>
    keys.reduce((o, k) => (obj[k] !== undefined ? ((o[k] = obj[k]), o) : o), {});

// ---------- load inputs ----------
const sensorsRaw  = readJson('./sql_sensors.json');
const readingsRaw = readJson('./sql_readings_100rows.json');

/*
  EXPECTED SHAPES (as provided to students):
  sensors:  { sensor_id, device_id, farm_id, crop, lat, lon, model, ... }
  readings: { reading_id, sensor_id, ts_utc, soil_moisture, temp_c, battery_v, ... }
*/

// ---------- normalize minimally (tolerate small naming variants) ----------
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

// ========== Q1: migrate & merge (join by sensor_id; exact schema required) ==========
const sensorById = toIndex(SENSORS, s => String(s.sensor_id));

const mergedDocs = READINGS
    .map(r => {
        const s = sensorById[String(r.sensor_id)];
        if (!s) return null; // orphan reading; skip

        // core document: EXACT field names required by the lab
        const coreDoc = {
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

        // ---------- Q2: 10+ metadata fields ----------
        const payloadForChecksum = JSON.stringify(
            pick(coreDoc, ['farmId','deviceId','ts_utc','soil_moisture','temp_c','battery_v'])
        );
        const checksum_md5 = crypto.createHash('md5').update(payloadForChecksum).digest('hex');

        const metadata = {
            uuid: coreDoc._id,                                     // 1
            author: 'Srinath',                                     // 2 (CHANGED)
            sync_time_utc: new Date().toISOString(),               // 3
            source_db: 'lab5-sql-json-sim',                        // 4
            source_tables: ['sql_readings_100rows', 'sql_sensors'],// 5
            ingest_batch_id: `batch_${Date.now()}`,                // 6
            lineage: `${s.device_id}/${r.reading_id}`,             // 7
            units: { soil_moisture: '%', temp_c: 'C', battery_v: 'V' }, // 8
            quality_flags: [],                                     // 9
            checksum_md5,                                          // 10
            record_source: 'lab5_sql_to_nosql',                    // 11
            transform_status: 'merged'                             // 12
        };

        return { ...coreDoc, metadata };
    })
    .filter(Boolean);

// write sample outputs (optional but helpful)
writeJson('./out_merged.json', mergedDocs);

// print for Q1 & Q2 screenshots (first 2–3 merged + one enriched doc)
const sampleFirst3 = mergedDocs.slice(0, 3);
const sampleEnriched = mergedDocs[0];
console.log('sample_merged_first3:', JSON.stringify(sampleFirst3, null, 2));
console.log('sample_enriched:', JSON.stringify(sampleEnriched, null, 2));

// ========== Q3: sharding with reduce (partition by farmId + day bucket) ==========
const toDay = (iso) => (typeof iso === 'string' ? iso.slice(0,10) : 'UNKNOWN'); // YYYY-MM-DD

const shards = mergedDocs.reduce((acc, d) => {
    const shardName = `readings_${d.farmId}_${toDay(d.ts_utc)}`;
    acc[shardName] = acc[shardName] ? acc[shardName].concat([d]) : [d];
    return acc;
}, {});

// Summaries for console screenshot
const shardSummary = Object.keys(shards)
    .sort()
    .map(name => ({ shard: name, count: shards[name].length }));

console.log('shards:', JSON.stringify(shardSummary, null, 2));
writeJson('./out_shard_index.json', shardSummary);

// ---------- final console summary ----------
const finalSummary = {
    inputs: {
        sensors: SENSORS.length,
        readings: READINGS.length
    },
    outputs: {
        merged_docs: mergedDocs.length,
        shards: shardSummary.length
    }
};
console.log('summary:', JSON.stringify(finalSummary, null, 2));