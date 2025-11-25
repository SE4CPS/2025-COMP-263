// ------------------ LOAD FILES ------------------
const sensors = require("./sql_sensors.json");
const readings = require("./sql_readings_100rows.json");

const crypto = require("crypto");

// ------------------ STEP 1: MERGE SQL TABLES USING map() + reduce() ------------------

// Build lookup for sensors by sensor_id
const sensorIndex = sensors.reduce((acc, s) => {
    acc[s.sensor_id] = s;
    return acc;
}, {});

// Join readings → sensor using map()
const merged = readings
    .map(r => {
        const s = sensorIndex[r.sensor_id];

        if (!s) return null; // skip if no match

        return {
            _id: crypto.randomUUID(),
            farmId: s.farm_id,
            deviceId: s.sensor_id,
            crop: s.crop,
            gps: { lat: s.gps_lat, lon: s.gps_lon },

            ts_utc: r.ts_utc,
            soil_moisture: r.soil_moisture,
            temp_c: r.temp_c,
            battery_v: r.battery_v
        };
    })
    .filter(Boolean);

console.log("\n--- MERGED (first 2 docs) ---");
console.log(JSON.stringify(merged.slice(0, 2), null, 2));

// ------------------ STEP 2: ADD METADATA USING map() ------------------

const enriched = merged.map(doc => {
    const checksum = crypto
        .createHash("md5")
        .update(JSON.stringify(doc))
        .digest("hex");

    return {
        ...doc,

        // Metadata (10+ fields)
        uuid: crypto.randomUUID(),
        checksum_md5: checksum,
        author: "migration_lab",
        sync_time_utc: new Date().toISOString(),
        source_db: "legacy_sql",
        source_tables: ["Sensor", "Reading"],
        ingest_batch_id: "batch-2025-11-01",
        lineage: { sensor: doc.deviceId },
        units: {
            temp: "Celsius",
            soil_moisture: "percentage",
            battery_v: "voltage"
        },
        quality_flags: {
            validated: true,
            missing_fields: false,
            checksum_ok: true
        }
    };
});

console.log("\n--- ENRICHED (first 2 docs) ---");
console.log(JSON.stringify(enriched.slice(0, 2), null, 2));

// ------------------ STEP 3: SHARD DATA USING reduce() ------------------

// Shard key = farmId + date bucket
// ---------------- SHARDING STEP ----------------

// Shard key = farm + date bucket
const getShardKey = (doc) => {
    const day = doc.ts_utc.split("T")[0]; // e.g., "2025-11-01"
    return `readings_${doc.farmId}_${day}`;
};

// Partition documents by shard key
const shards = enriched.reduce((acc, doc) => {
    const key = getShardKey(doc);

    // create shard bucket if it doesn't exist
    acc[key] = acc[key] || [];

    // append document using reduce-safe push
    acc[key] = [...acc[key], doc];

    return acc;
}, {});

// ---------------- LOG OUTPUT ----------------
console.log("\n--- SHARD NAMES & COUNTS ---");
Object.entries(shards).forEach(([name, docs]) => {
    console.log(`${name}: ${docs.length} docs`);
});

console.log("\n--- SAMPLE SHARD PREVIEW ---");
const firstShard = Object.keys(shards)[0];
console.log(firstShard, shards[firstShard].slice(0, 2));