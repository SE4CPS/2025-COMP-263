// Load SQL-style sensor + reading data
const sensors = require("./sql_sensors.json");
const readings = require("./sql_readings_100rows.json");

// Helper to generate UUID (simple version for the lab)
const uuid = () => crypto.randomUUID();
const crypto = require("crypto");

// STEP 1: Map sensors into lookup object: { sensor_id → sensorRecord }
const sensorIndex = sensors.reduce((acc, s) => {
    acc[s.sensor_id] = s;
    return acc;
}, {});

// STEP 2: Merge readings with their sensors
const merged = readings
    .map(read => {
        const sensor = sensorIndex[read.sensor_id];

        if (!sensor) return null; // ignore orphans

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
    .filter(doc => doc !== null); // remove nulls

console.log("First 3 merged docs:\n");
console.log(JSON.stringify(merged.slice(0, 3), null, 2));