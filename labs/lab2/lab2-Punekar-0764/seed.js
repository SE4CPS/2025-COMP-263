// seed.js
const { MongoClient } = require('mongodb');
const { randomUUID } = require('crypto');
const assert = require('assert');

(async () => {
  // Use your Atlas URI via env var (no conditionals):
  const uri = process.env.MONGODB_URI;            // e.g. "mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority"
  assert(uri, 'Set MONGODB_URI env var to your Atlas connection string');

  const client = new MongoClient(uri);
  await client.connect();

  const col = client.db('Lab2').collection('Agriculture');

  // Build ids 1..10 using map/filter
  const ids = Array.from({ length: 12 }, (_, i) => i + 1).filter(n => n <= 10);

  // Shared metadata (UTC ISO)
  const metadata = {
    author: 'Omkar Prathamesh',
    last_sync: new Date().toISOString(), // UTC
    uuid_source: randomUUID()
  };

  const base = Date.now();
  const docs = ids.map(i => ({
    id: i,
    sensorId: `sensor-${(i % 3) + 1}`,
    reading: Number((10 + Math.random() * 90).toFixed(2)),
    timestamp: new Date(base - i * 60_000).toISOString(), // UTC ISO
    notes: `Reading #${i}`,
    metadata
  }));

  // Upsert exactly these 10 (no loops; map + Promise.all)
  await Promise.all(
    docs.map(d =>
      col.updateOne({ id: d.id }, { $set: d }, { upsert: true })
    )
  );

  // Reduce used to produce a quick checksum/summary
  const sum = docs.reduce((acc, d) => acc + d.reading, 0).toFixed(2);
  console.log(`Upserted 10 docs. Sum(reading)=${sum}`);

  await client.close();
})().catch(e => { console.error(e); process.exit(1); });
