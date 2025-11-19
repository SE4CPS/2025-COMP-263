// labs/lab3/Lab3-Pujari-03156/indexeddb_ingest_server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = `${process.env.MONGO_HOST}?authSource=admin&retryWrites=true&w=majority`;
const mongo = new MongoClient(MONGO_URI, {
    auth: { username: process.env.MONGO_USER, password: process.env.MONGO_PASS }
});

let collection;

async function init() {
    await mongo.connect();
    const db = mongo.db(process.env.MONGO_DB);
    collection = db.collection(process.env.MONGO_LAKE_COLLECTION);
    console.log(`Mongo connected → ${process.env.MONGO_DB}/${process.env.MONGO_LAKE_COLLECTION}`);
}
init().catch(err => {
    console.error('Mongo init error:', err);
    process.exit(1);
});

app.get('/', (_req, res) => res.send('Lab3 ingest server is running'));

app.post('/ingest', async (req, res) => {
    try {
        const { docs, metadata } = req.body || {};

        if (!Array.isArray(docs) || docs.length !== 10) {
            return res.status(400).json({ error: 'You must send exactly 10 documents in "docs".' });
        }
        if (!metadata || typeof metadata !== 'object') {
            return res.status(400).json({ error: 'Missing "metadata" object.' });
        }

        // Choose author: prefer metadata.author, otherwise env default, otherwise Unknown
        const author = (metadata.author && String(metadata.author).trim())
            ? String(metadata.author).trim()
            : (process.env.AUTHOR_NAME || 'Unknown Author');

        // Basic UTC check for timestamps
        const badTs = docs
            .map(d => d.timestamp)
            .filter(ts => typeof ts !== 'string' || !ts.endsWith('Z'));
        if (badTs.length > 0) {
            return res.status(400).json({ error: 'All document timestamps must be UTC ISO strings ending with "Z".' });
        }

        // Enrich each doc: author, sourceDB, ingestedAt
        const enriched = docs.map(d => ({
            ...d,
            author,
            sourceDB: 'IndexedDB',
            ingestedAt: new Date().toISOString()
        }));

        // Insert 10 docs
        const r1 = await collection.insertMany(enriched, { ordered: true });

        // Insert metadata as a separate document (keep author too)
        const r2 = await collection.insertOne({
            ...metadata,
            author,
            sourceDB: 'IndexedDB',
            ingestedAt: new Date().toISOString(),
            _type: 'metadata'
        });

        res.json({
            message: 'Insert complete',
            insertedDocs: r1.insertedCount,
            insertedMetadata: r2.insertedId ? 1 : 0,
            authorUsed: author
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Insert failed' });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Ingest server running at http://localhost:${PORT}`));
