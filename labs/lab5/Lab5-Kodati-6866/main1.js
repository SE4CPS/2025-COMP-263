const sensors = require("./sql_sensors.json");
const readings = require("./sql_readings_100rows.json");
const crypto = require("crypto");

// ------------ Helper Functions ------------
const uuid = () => crypto.randomUUID();
const md5 = (obj) =>
    crypto.createHash("md5").update(JSON.stringify(obj)).digest("hex");

// ------------ STEP 1: Build Sensor Lookup (reduce) ------------
const sensorIndex = sensors.reduce((acc, s) => {
    acc[s.sensor_id] = s;
    return acc;
}, {});

// ------------ STEP 2: Merge Sensors + Readings (map + filter) ------------
const merged = readings
    .map(read => {
        const sensor = sensorIndex[read.sensor_id];
        if (!sensor) return null; // skip records with missing sensor

        return {
            _id: uuid(),
            farmId: sensor.farm_id,
            deviceId: sensor.sensor_id,
            crop: sensor.crop,
            gps: { lat: sensor.gps_lat, lon: sensor.gps_lon },
            ts_utc: read.ts_utc,
            soil_moisture: read.soil_moisture,
            temp_c: read.temp_c,
            battery_v: read.battery_v
        };
    })
    .filter(doc => doc !== null);

// ------------ STEP 3: Add Metadata (map only) ------------
const enriched = merged.map(doc => {
    const payloadChecksum = md5({
        ts_utc: doc.ts_utc,
        soil_moisture: doc.soil_moisture,
        temp_c: doc.temp_c,
        battery_v: doc.battery_v
    });

    return {
        ...doc,
        metadata: {
            uuid: uuid(),
            checksum_md5: payloadChecksum,
            author: "Pavan Sriram Kodati",
            sync_time_utc: new Date().toISOString(),
            source_db: "SQL-Agriculture-DB",
            source_tables: ["Sensor", "Reading"],
            ingest_batch_id: "BATCH-" + Date.now(),
            lineage: {
                sensor_id: doc.deviceId,
                ts_utc: doc.ts_utc
            },
            units: {
                temp_c: "°C",
                soil_moisture: "%",
                battery_v: "V"
            },
            quality_flags: {
                missing_fields: false,
                outlier_detected: false,
                battery_low: doc.battery_v < 3.5
            }
        }
    };
});

// ------------ OUTPUT (first 3 docs) ------------
console.log("First 3 enriched documents:\n");
console.log(JSON.stringify(enriched.slice(0, 3), null, 2));