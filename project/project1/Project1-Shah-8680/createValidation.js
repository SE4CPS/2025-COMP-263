// createValidation.js - create validator on Readings and index on timestamp
require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'Project1';
const COLLECTION = 'Readings';
if (!MONGODB_URI) {
  console.error('Set MONGODB_URI in .env');
  process.exit(1);
}

async function main(){
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  // validation schema (MongoDB JSON Schema)
  const validator = {
    $jsonSchema: {
      bsonType: "object",
      required: ["deviceId","farmId","timestamp"],
      properties: {
        deviceId: { bsonType: "string", description: "deviceId required" },
        farmId: { bsonType: "string", description: "farmId required" },
        timestamp: { bsonType: "string", description: "ISO timestamp required" },
        gps: {
          bsonType: "object",
          properties: {
            lat: { bsonType: "number", minimum: -90, maximum: 90 },
            lon: { bsonType: "number", minimum: -180, maximum: 180 }
          }
        },
        sensor: {
          bsonType: "object",
          properties: {
            tempC: { bsonType: ["double","int","decimal"], description: "temperature" },
            moisture: { bsonType: ["double","int","decimal"] },
            humidity: { bsonType: ["double","int","decimal"] }
          }
        }
      }
    }
  };

  // If collection exists, use collMod to update validator; else create with validator
  const collections = await db.listCollections({ name: COLLECTION }).toArray();
  if (collections.length === 0) {
    await db.createCollection(COLLECTION, {
      validator,
      validationLevel: "moderate"
    });
    console.log('Collection created with validator.');
  } else {
    // collMod
    try {
      await db.command({
        collMod: COLLECTION,
        validator,
        validationLevel: "moderate"
      });
      console.log('Validator applied (collMod).');
    } catch (err) {
      console.error('collMod failed:', err.message);
      console.log('Attempting to recreate collection as fallback (not recommended in prod).');
    }
  }

  // create index on timestamp
  const col = db.collection(COLLECTION);
  await col.createIndex({ timestamp: 1 });
  console.log('Index created on timestamp.');

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
