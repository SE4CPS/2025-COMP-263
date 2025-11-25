const fs = require("fs");
const crypto = require("crypto");

// Load SQL-like sensor and reading tables
const sensors = JSON.parse(fs.readFileSync("sql_sensors.json", "utf8"));
const readings = JSON.parse(fs.readFileSync("sql_readings_100rows.json", "utf8"));

// Build lookup using reduce()
const sensorById = sensors.reduce((acc, s) => {
  acc[s.sensor_id] = s;
  return acc;
}, {});

// Function: MD5 checksum
const md5 = (text) => crypto.createHash("md5").update(text).digest("hex");

// MAIN MERGE + ENRICH --------------------------------------------------------
const merged = readings.map((r, index) => {
  const sensor = sensorById[r.sensor_id];

  const doc = {
    _id: crypto.randomUUID(),
    farmId: sensor.farm_id,
    deviceId: sensor.device_id,
    crop: sensor.crop,
    gps: {
      lat: sensor.lat,
      lon: sensor.lon
    },

    ts_utc: r.ts_utc,
    soil_moisture: r.soil_moisture,
    temp_c: r.temp_c,
    battery_v: r.battery_v,

    // -----------------------
    // ADDING 10+ METADATA FIELDS HERE
    // -----------------------
    metadata: {
      uuid: crypto.randomUUID(),
      checksum_md5: md5(JSON.stringify(r)),
      author: "Shreyas Alimath",
      sync_time_utc: new Date().toISOString(),
      source_db: "agri_prod_sql",
      source_tables: ["sql_sensors", "sql_readings_100rows"],
      ingest_batch_id: "BATCH-" + String(index + 1).padStart(4, "0"),
      lineage: {
        sensor_row_id: sensor.sensor_id,
        reading_row_id: r.reading_id || index,
      },
      units: {
        soil_moisture: "%",
        temp_c: "°C",
        battery_v: "V",
      },
      quality_flags: {
        completeness: "complete",
        sensor_status: sensor.status || "OK",
      }
    }
  };

  return doc;
});

// Show first enriched doc for your screenshot
console.log(JSON.stringify(merged[0], null, 2));

// Optional: write full results
fs.writeFileSync("merged_with_metadata.json", JSON.stringify(merged, null, 2));

