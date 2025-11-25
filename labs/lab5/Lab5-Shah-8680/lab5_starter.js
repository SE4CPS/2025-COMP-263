const fs = require("fs");
const crypto = require("crypto");

const AUTHOR = "Parth Shah";
const SENSORS_FILE = "./sql_sensors.json";
const READINGS_FILE = "./sql_readings_100rows.json";

const genUuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const md5 = str => crypto.createHash("md5").update(str).digest("hex");

const shardKeyForDoc = doc => {
  const day = doc.ts_utc.slice(0, 10); 
  return `readings_${doc.farmId}_${day}`;
};


const sensors = JSON.parse(fs.readFileSync(SENSORS_FILE, "utf8"));
const readings = JSON.parse(fs.readFileSync(READINGS_FILE, "utf8"));

console.log(`Loaded ${sensors.length} sensors and ${readings.length} readings.`);

// ---------- 1. MIGRATE + MERGE SQL DATA ----------

const sensorsById = sensors.reduce((acc, sensor) => {
  return {
    ...acc,
    [sensor.sensor_id]: sensor
  };
}, {});

const mergedDocs = readings
  .map(reading => {
    const sensor = sensorsById[reading.sensor_id];

    if (!sensor) return null;

    return {
      _id: genUuid(),
      farmId: sensor.farm_id,
      deviceId: sensor.sensor_id,
      crop: sensor.crop,
      gps: { lat: sensor.gps_lat, lon: sensor.gps_lon },
      ts_utc: reading.ts_utc,
      soil_moisture: reading.soil_moisture,
      temp_c: reading.temp_c,
      battery_v: reading.battery_v
    };
  })
  .filter(doc => doc !== null);

console.log("\n=== 1) MERGED DOCS (first 3) ===");
mergedDocs.slice(0, 3).forEach(d => console.dir(d, { depth: null }));


fs.writeFileSync("out_merged.json", JSON.stringify(mergedDocs, null, 2));
console.log("✅ Saved merged output to out_merged.json");


// ---------- 2. ENRICH WITH METADATA ----------

const nowIso = new Date().toISOString();
const batchId = `batch-${nowIso.slice(0, 10)}`;

const enrichedDocs = mergedDocs.map(doc => {
  const baseString = JSON.stringify(doc);
  const checksum_md5 = md5(baseString);

  return {
    ...doc,

    uuid: doc._id,
    checksum_md5,
    author: AUTHOR,
    sync_time_utc: nowIso,
    source_db: "farm_sql_db",
    source_tables: ["Sensor", "Reading"],
    ingest_batch_id: batchId,
    lineage: "Sensor.sensor_id -> Reading.sensor_id -> NoSQL.readingDoc",
    units: {
      temp_c: "Celsius",
      soil_moisture: "percent",
      battery_v: "Volts"
    },
    quality_flags: {
      missing_values: false,
      out_of_range: false
    },
    version: 1
  };
});

console.log("\n=== 2) ENRICHED DOC (first 1) ===");
console.dir(enrichedDocs[0], { depth: null });

// ---------- 3. SHARD THE DATA ----------

const shards = enrichedDocs.reduce((acc, doc) => {
  const key = shardKeyForDoc(doc);
  const existing = acc[key] || [];
  return {
    ...acc,
    [key]: [...existing, doc]
  };
}, {});


console.log("\n=== 3) SHARDS & COUNTS ===");
Object.entries(shards).map(([name, docs]) =>
  console.log(`${name}: ${docs.length} docs`)
);

const totalInShards = Object.values(shards).reduce(
  (sum, arr) => sum + arr.length,
  0
);
console.log(`\nTotal docs across all shards: ${totalInShards}`);

fs.writeFileSync("out_shard_index.json", JSON.stringify(shards, null, 2));
console.log("✅ Saved shard index to out_shard_index.json");

