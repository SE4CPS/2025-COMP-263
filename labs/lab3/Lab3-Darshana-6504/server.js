const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve files from current directory

const mongoUri = process.env.MONGO_HOST;
const client = new MongoClient(mongoUri);
const db = process.env.MONGO_DB || 'Project1';
const collection = process.env.MONGO_LAKE_COLLECTION || 'lake';

console.log('MongoDB Configuration:');
console.log('URI:', mongoUri);
console.log('Database:', db);
console.log('Collection:', collection);

function nowUTC() {
  return new Date().toISOString();
}

// Test MongoDB connection
app.get('/test-connection', async (req, res) => {
  try {
    await client.connect();
    const adminDb = client.db(db);
    const collections = await adminDb.listCollections().toArray();
    
    res.json({ 
      ok: true, 
      message: 'Successfully connected to MongoDB',
      database: db,
      collections: collections.map(c => c.name)
    });
  } catch (e) {
    console.error('Connection test failed:', e);
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    await client.close().catch(()=>{});
  }
});

app.post('/ingest/indexeddb', async (req, res) => {
  try {
    console.log('Request received at /ingest/indexeddb');
    console.log('Request headers:', req.headers);
    console.log('Received request body:', JSON.stringify(req.body, null, 2));
    
    const { metadata, docs } = req.body;
    console.log('Parsed metadata:', metadata);
    console.log('Parsed docs:', docs);
    
    if (!metadata || typeof metadata !== 'object') {
      console.log('Invalid metadata:', metadata);
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid metadata: metadata object is required'
      });
    }
    
    if (!docs || !Array.isArray(docs)) {
      console.log('Invalid docs:', docs);
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid docs: array of documents is required'
      });
    }

    if (docs.length !== 10) {
      console.log('Invalid number of docs:', docs.length);
      return res.status(400).json({ 
        ok: false, 
        error: `Invalid number of documents: expected 10, got ${docs.length}`
      });
    }
    
    // Validate document structure
    const invalidDocs = docs.filter(doc => {
      const isValid = doc.sensorId && typeof doc.reading === 'number' && doc.timestamp;
      if (!isValid) {
        console.log('Invalid document found:', doc);
      }
      return !isValid;
    });
    
    if (invalidDocs.length > 0) {
      console.log('Invalid documents found:', invalidDocs);
      return res.status(400).json({
        ok: false,
        error: 'Invalid document structure: each document must have sensorId, reading, and timestamp',
        invalidDocs
      });
    }
    
    console.log('Attempting to connect to MongoDB...');
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    const documentsToInsert = docs.map(doc => ({
      ...doc,
      metadata,
      ingestedAt: nowUTC()
    }));
    
    console.log(`Inserting ${documentsToInsert.length} documents into ${db}.${collection}...`);
    const result = await client.db(db).collection(collection).insertMany(documentsToInsert);
    console.log('Insert successful:', result);
    
    res.json({ 
      ok: true, 
      message: `Successfully inserted ${result.insertedCount} documents`,
      insertedCount: result.insertedCount,
      insertedIds: result.insertedIds
    });
  } catch (e) {
    console.error('Error during data insertion:', e);
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    await client.close().catch(()=>{});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ingest server listening on :${PORT}`));
