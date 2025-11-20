const fs = require('fs');
const crypto = require('crypto');
const { randomUUID } = require('crypto');

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p, data) =>
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');

const indexBy = (arr, keyFn) =>
    arr.reduce((acc, x) => ((acc[keyFn(x)] = x), acc), {});

const pluck = (obj, keys) =>
    keys.reduce((out, k) => {
        if (obj[k] !== undefined) out[k] = obj[k];
        return out;
    }, {});

const rawSensors = read('./sql_sensors.json');
const rawReadings = read('./sql_readings_100rows.json');
const normalizeSensor = (s) => ({
    sensor_id: s.sensor_id ?? s.sensorId ?? s.id,
    device_id: s.device_id ?? s.deviceId,
    farm_id: s.farm_id ?? s.farmId,
    crop: s.crop,
    lat: s.lat ?? s.latitude,
    lon: s.lon ?? s.longitude,
    model: s.model,
    __raw: s
});

const normalizeReading = (r) => ({
    reading_id: r.reading_id ?? r.id,
    sensor_id: r.sensor_id ?? r.sensorId,
    ts_utc: r.ts_utc ?? r.ts ?? r.timestamp,
    soil_moisture: Number(r.soil_moisture ?? r.value),
    temp_c: Number(r.temp_c ?? r.temperature_c ?? r.temperature),
    battery_v: Number(r.battery_v ?? r.batt_v),
    __raw: r
});

const SENSORS = rawSensors.map(normalizeSensor).filter(s => s.sensor_id);
const READINGS = rawReadings.map(normalizeReading).filter(r => r.sensor_id && r.ts_utc);

// Q1 — Merge SQL → NoSQL (JOIN BY sensor_id)
const sensorsById = indexBy(SENSORS, s => String(s.sensor_id));

const mergedDocs = READINGS
    .map(r => {
        const s = sensorsById[String(r.sensor_id)];
        if (!s) return null;

        const base = {
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

        // Q2 — Metadata (10+ fields)
        const checksum = crypto
            .createHash('md5')
            .update(
                JSON.stringify(
                    pluck(base, [
                        'farmId', 'deviceId',
                        'ts_utc', 'soil_moisture',
                        'temp_c', 'battery_v'
                    ])
                )
            )
            .digest('hex');

        const metadata = {
            uuid: base._id,
            author: 'Deepika Jakati',
            sync_time_utc: new Date().toISOString(),
            source_db: 'lab5-sql-json-sim',
            source_tables: ['sql_sensors', 'sql_readings_100rows'],
            ingest_batch_id: 'batch_' + Date.now(),
            lineage: `${s.device_id}/${r.reading_id}`,
            units: { soil_moisture: '%', temp_c: 'C', battery_v: 'V' },
            quality_flags: [],
            checksum_md5: checksum,
            record_source: 'lab5_sql_to_nosql',
            transform_status: 'merged'
        };

        return { ...base, metadata };
    })
    .filter(Boolean);

write('./out_merged.json', mergedDocs);


// Q3 — Sharding (Partition by farmId + day)

const dayOf = (iso) => (typeof iso === 'string' ? iso.slice(0, 10) : 'UNKNOWN');

const shards = mergedDocs.reduce((acc, doc) => {
    const shard = `readings_${doc.farmId}_${dayOf(doc.ts_utc)}`;
    acc[shard] = acc[shard] ? acc[shard].concat([doc]) : [doc];
    return acc;
}, {});

const shardSummary = Object.keys(shards)
    .sort()
    .map(name => ({ shard: name, count: shards[name].length }));

write('./out_shard_index.json', shardSummary);

// Console Samples
console.log(
    'sample_merged_first3:',
    JSON.stringify(mergedDocs.slice(0, 3), null, 2)
);

console.log(
    'sample_enriched:',
    JSON.stringify(mergedDocs[0], null, 2)
);

console.log(
    'shards:',
    JSON.stringify(shardSummary, null, 2)
);

console.log(
    'summary:',
    JSON.stringify(
        {
            inputs: {
                sensors: SENSORS.length,
                readings: READINGS.length
            },
            outputs: {
                merged_docs: mergedDocs.length,
                shards: shardSummary.length
            }
        },
        null,
        2
    )
);