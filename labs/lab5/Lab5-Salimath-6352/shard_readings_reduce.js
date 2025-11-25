// shard_readings_reduce.js
// Usage: node shard_readings_reduce.js
// Shards merged_with_metadata.json by farmId + day bucket using reduce()

const fs = require('fs');
const path = require('path');

const inFile = path.resolve(__dirname, 'merged_with_metadata.json');
if (!fs.existsSync(inFile)) {
  console.error('ERROR: merged_with_metadata.json not found in this folder.');
  process.exit(1);
}

// Load enriched docs (array)
const docs = JSON.parse(fs.readFileSync(inFile, 'utf8'));

// helper: derive day bucket YYYY-MM-DD from ISO ts_utc
const getDayBucket = (isoTs) => {
  try {
    const d = new Date(isoTs);
    if (Number.isNaN(d.getTime())) return 'unknown-day';
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  } catch (e) { return 'unknown-day'; }
};

// 1) Partition into shards using reduce()
// Shard key: farmId + dayBucket -> shard name: readings_<farmId>_<YYYY-MM-DD>
const shards = docs.reduce((acc, doc) => {
  const farmId = doc.farmId || 'FARM-UNKNOWN';
  const day = getDayBucket(doc.ts_utc || doc.metadata?.sync_time_utc);
  const shardName = `readings_${farmId}_${day}`;

  // functional-style accumulation: concat to avoid in-place push
  acc[shardName] = (acc[shardName] || []).concat([doc]);
  return acc;
}, {});

// 2) Print shard names and counts (human-friendly + JSON summary)
console.log('--- Shard names and counts ---\n');

Object.keys(shards)
  .sort()
  .forEach(name => {
    console.log(`${name}: ${shards[name].length} docs`);
  });

const summary = Object.keys(shards).sort().map(name => ({ shard: name, count: shards[name].length }));

console.log('\nSummary JSON:');
console.log(JSON.stringify(summary, null, 2));

// 3) Optional: write each shard to disk (uncomment to enable)
const writeShards = false;
if (writeShards) {
  Object.entries(shards).forEach(([name, arr]) => {
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    fs.writeFileSync(path.join(__dirname, `${safeName}.json`), JSON.stringify(arr, null, 2), 'utf8');
  });
  console.log('\nShard files written to disk.');
} else {
  console.log('\nShard files NOT written (writeShards=false). To persist, set writeShards=true in the script.');
}
