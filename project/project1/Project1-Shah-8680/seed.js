// seed.js - create 50 sample IoT readings
require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'Project1';
const COLLECTION = 'Readings';
if (!MONGODB_URI) {
  console.error('Set MONGODB_URI in .env');
  process.exit(1);
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

async function main(){
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const col = db.collection(COLLECTION);

  // create some farmIds and deviceIds
  const farms = ['farm-01', 'farm-02', 'farm-03'];
  const devices = ['sensor-001','sensor-002','sensor-003','sensor-004','sensor-005'];

  const now = Date.now();
  const docs = [];
  for (let i=0;i<50;i++){
    const deviceId = devices[i % devices.length];
    const farmId = farms[i % farms.length];
    const ts = new Date(now - (i * 1000 * 60 * 60)); // each reading 1 hour earlier
    const doc = {
      deviceId,
      farmId,
      sensor: {
        tempC: Number((randomInRange(10, 35)).toFixed(2)),
        moisture: Number((randomInRange(10, 90)).toFixed(2)),
        humidity: Number((randomInRange(20, 90)).toFixed(2))
      },
      gps: {
        lat: Number((randomInRange(-45, 45)).toFixed(6)),
        lon: Number((randomInRange(-120, 120)).toFixed(6))
      },
      note: `auto-generated sample ${i+1}`,
      timestamp: ts.toISOString(),
      ingestedAt: new Date().toISOString()
    };
    docs.push(doc);
  }

  const result = await col.insertMany(docs);
  console.log('Inserted documents:', result.insertedCount);
  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
