// Lab 5: SQL to NoSQL Migration for Agricultural Sensor Data
// Using Functional Programming: map(), filter(), reduce()

const crypto = require('crypto');

// Simple UUID generator function (replacing uuid package)
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Sample Data (simulating the JSON files from GitHub)
const sql_sensors = [
  {
    sensor_id: 1042,
    farm_id: "FARM-001",
    device_id: "SNS-1042",
    crop_type: "Almond",
    latitude: 37.95,
    longitude: -121.29,
    install_date: "2024-03-15"
  },
  {
    sensor_id: 1043,
    farm_id: "FARM-001",
    device_id: "SNS-1043",
    crop_type: "Walnut",
    latitude: 37.96,
    longitude: -121.30,
    install_date: "2024-03-16"
  },
  {
    sensor_id: 2001,
    farm_id: "FARM-002",
    device_id: "SNS-2001",
    crop_type: "Grape",
    latitude: 38.15,
    longitude: -121.45,
    install_date: "2024-04-01"
  },
  {
    sensor_id: 2002,
    farm_id: "FARM-002",
    device_id: "SNS-2002",
    crop_type: "Grape",
    latitude: 38.16,
    longitude: -121.46,
    install_date: "2024-04-01"
  },
  {
    sensor_id: 3001,
    farm_id: "FARM-003",
    device_id: "SNS-3001",
    crop_type: "Tomato",
    latitude: 36.75,
    longitude: -119.80,
    install_date: "2024-05-10"
  }
];

const sql_readings = [
  {
    reading_id: 1,
    sensor_id: 1042,
    timestamp: "2025-11-01T06:13:00Z",
    soil_moisture: 33.2,
    temperature_c: 21.3,
    battery_voltage: 3.9
  },
  {
    reading_id: 2,
    sensor_id: 1042,
    timestamp: "2025-11-01T12:13:00Z",
    soil_moisture: 31.8,
    temperature_c: 24.5,
    battery_voltage: 3.9
  },
  {
    reading_id: 3,
    sensor_id: 1043,
    timestamp: "2025-11-01T06:15:00Z",
    soil_moisture: 28.5,
    temperature_c: 20.9,
    battery_voltage: 4.1
  },
  {
    reading_id: 4,
    sensor_id: 2001,
    timestamp: "2025-11-02T07:00:00Z",
    soil_moisture: 35.7,
    temperature_c: 19.8,
    battery_voltage: 3.8
  },
  {
    reading_id: 5,
    sensor_id: 2001,
    timestamp: "2025-11-02T13:00:00Z",
    soil_moisture: 34.2,
    temperature_c: 23.1,
    battery_voltage: 3.7
  },
  {
    reading_id: 6,
    sensor_id: 2002,
    timestamp: "2025-11-02T07:05:00Z",
    soil_moisture: 36.1,
    temperature_c: 19.5,
    battery_voltage: 4.0
  },
  {
    reading_id: 7,
    sensor_id: 3001,
    timestamp: "2025-11-03T08:00:00Z",
    soil_moisture: 42.3,
    temperature_c: 22.7,
    battery_voltage: 3.6
  },
  {
    reading_id: 8,
    sensor_id: 3001,
    timestamp: "2025-11-03T14:00:00Z",
    soil_moisture: 40.8,
    temperature_c: 26.4,
    battery_voltage: 3.6
  }
];

console.log("=".repeat(80));
console.log("LAB 5: SQL to NoSQL Migration - Agricultural Sensor Data");
console.log("=".repeat(80));
console.log("\n");

// ============================================================================
// QUESTION 1: Migrate and Merge SQL Data
// ============================================================================
console.log("QUESTION 1: Migrate and Merge SQL Data");
console.log("-".repeat(80));

// Use map() to transform readings and join with sensor data
const mergedDocuments = sql_readings.map(reading => {
  // Find matching sensor using filter (returns array, take first element)
  const sensor = sql_sensors.filter(s => s.sensor_id === reading.sensor_id)[0];
  
  if (!sensor) {
    console.warn(`Warning: No sensor found for sensor_id ${reading.sensor_id}`);
    return null;
  }
  
  // Create merged document following the required schema
  return {
    _id: uuidv4(),
    farmId: sensor.farm_id,
    deviceId: sensor.device_id,
    crop: sensor.crop_type,
    gps: {
      lat: sensor.latitude,
      lon: sensor.longitude
    },
    ts_utc: reading.timestamp,
    soil_moisture: reading.soil_moisture,
    temp_c: reading.temperature_c,
    battery_v: reading.battery_voltage
  };
}).filter(doc => doc !== null); // Remove any null entries

console.log("\nMerged Documents (First 3):");
console.log(JSON.stringify(mergedDocuments.slice(0, 3), null, 2));
console.log(`\nTotal merged documents: ${mergedDocuments.length}`);

// ============================================================================
// QUESTION 2: Enrich Data with Metadata
// ============================================================================
console.log("\n\n" + "=".repeat(80));
console.log("QUESTION 2: Enrich Data with Metadata");
console.log("-".repeat(80));

// Function to calculate MD5 checksum
function calculateChecksum(data) {
  const jsonString = JSON.stringify(data);
  return crypto.createHash('md5').update(jsonString).digest('hex');
}

// Function to extract day from timestamp
function getDayBucket(timestamp) {
  return timestamp.split('T')[0]; // Returns YYYY-MM-DD
}

// Use map() to enrich each document with metadata
const enrichedDocuments = mergedDocuments.map((doc, index) => {
  const coreData = { ...doc };
  const dayBucket = getDayBucket(doc.ts_utc);
  
  // Add 10+ metadata fields
  return {
    ...coreData,
    // Metadata fields
    uuid: doc._id, // Duplicate for clarity
    checksum_md5: calculateChecksum(coreData),
    author: "AgriSensor Migration Pipeline v1.0",
    sync_time_utc: new Date().toISOString(),
    source_db: "mysql://agri-sensors-prod.db",
    source_tables: ["sensors", "readings"],
    ingest_batch_id: `BATCH-2025-11-24-${String(Math.floor(index / 10)).padStart(4, '0')}`,
    lineage: `SQL:sensors[sensor_id=${coreData.deviceId}] JOIN SQL:readings[reading_id]`,
    units: {
      soil_moisture: "percent",
      temp_c: "celsius",
      battery_v: "volts"
    },
    quality_flags: {
      validated: true,
      outlier_detected: false,
      sensor_health: coreData.battery_v >= 3.5 ? "good" : "warning"
    },
    migration_version: "1.0.0",
    schema_version: "v2.1",
    data_classification: "operational",
    retention_days: 365,
    shard_key_hint: `${coreData.farmId}_${dayBucket}`
  };
});

console.log("\nEnriched Document Example (First Document with All Metadata):");
console.log(JSON.stringify(enrichedDocuments[0], null, 2));
console.log(`\nTotal enriched documents: ${enrichedDocuments.length}`);

// ============================================================================
// QUESTION 3: Shard the Data
// ============================================================================
console.log("\n\n" + "=".repeat(80));
console.log("QUESTION 3: Shard the Data");
console.log("-".repeat(80));

// Shard key strategy: {farmId}_{dayBucket}
// This approach:
// 1. Distributes data by farm (natural business partition)
// 2. Further partitions by day (time-based distribution)
// 3. Avoids write hotspots by spreading writes across farm-day combinations
// 4. Enables efficient queries by farm and/or date range

const shardedCollections = enrichedDocuments.reduce((shards, doc) => {
  // Create shard key: farmId + dayBucket
  const dayBucket = getDayBucket(doc.ts_utc);
  const shardKey = `readings_${doc.farmId}_${dayBucket}`;
  
  // Initialize shard collection if it doesn't exist
  if (!shards[shardKey]) {
    shards[shardKey] = [];
  }
  
  // Add document to appropriate shard
  shards[shardKey].push(doc);
  
  return shards;
}, {});

console.log("\nShard Distribution:");
console.log("-".repeat(80));

Object.keys(shardedCollections).sort().forEach(shardName => {
  const count = shardedCollections[shardName].length;
  console.log(`${shardName}: ${count} documents`);
});

console.log(`\nTotal shards created: ${Object.keys(shardedCollections).length}`);
console.log(`Total documents distributed: ${enrichedDocuments.length}`);

console.log("\n\nShard Key Logic Explanation:");
console.log("-".repeat(80));
console.log("Shard Key: {farmId}_{dayBucket}");
console.log("\nWhy this avoids write hotspots:");
console.log("1. Multi-dimensional partitioning: Combines farm location with time");
console.log("2. Natural distribution: Each farm-day combination creates a unique shard");
console.log("3. Time-based spreading: Daily buckets distribute writes over time");
console.log("4. Scalability: As farms grow, new shards are automatically created");
console.log("5. Query optimization: Efficient for farm-specific and date-range queries");

// ============================================================================
// Additional Statistics
// ============================================================================
console.log("\n\n" + "=".repeat(80));
console.log("MIGRATION STATISTICS");
console.log("-".repeat(80));

const stats = {
  total_sensors: sql_sensors.length,
  total_readings: sql_readings.length,
  merged_documents: mergedDocuments.length,
  enriched_documents: enrichedDocuments.length,
  total_shards: Object.keys(shardedCollections).length,
  unique_farms: [...new Set(mergedDocuments.map(d => d.farmId))].length,
  unique_days: [...new Set(mergedDocuments.map(d => getDayBucket(d.ts_utc)))].length,
  avg_docs_per_shard: (enrichedDocuments.length / Object.keys(shardedCollections).length).toFixed(2)
};

console.log(JSON.stringify(stats, null, 2));

// ============================================================================
// Example: Query a specific shard
// ============================================================================
console.log("\n\n" + "=".repeat(80));
console.log("EXAMPLE: Querying a Specific Shard");
console.log("-".repeat(80));

const exampleShardKey = Object.keys(shardedCollections)[0];
console.log(`\nShard: ${exampleShardKey}`);
console.log(`Documents in this shard: ${shardedCollections[exampleShardKey].length}`);
console.log("\nFirst document in shard:");
console.log(JSON.stringify(shardedCollections[exampleShardKey][0], null, 2));

console.log("\n" + "=".repeat(80));
console.log("LAB 5 COMPLETE");
console.log("=".repeat(80));
