// server/server.js
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

// === Class connection string (provided by instructor) ===
const MONGO_URI = 'mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/';

// Target DB + collection per assignment
const DB_NAME = 'Lab2';
const COLL_NAME = 'Agriculture';

let client, collection;

async function init() {
    client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    await client.connect();
    const db = client.db(DB_NAME);
    collection = db.collection(COLL_NAME);
    console.log('Connected to MongoDB Atlas:', DB_NAME, '/', COLL_NAME);
}
init().catch(err => {
    console.error('Mongo init error:', err);
    process.exit(1);
});

app.get('/', (_req, res) => res.send('Lab2 sync server is running'));

// Accept POST with { docs: [...10...], metadata: {...} }
app.post('/sync', async (req, res) => {
    try {
        const { docs, metadata } = req.body || {};

        if (!Array.isArray(docs) || docs.length !== 10) {
            return res.status(400).json({ error: 'You must send exactly 10 documents in "docs".' });
        }
        if (!metadata || typeof metadata !== 'object') {
            return res.status(400).json({ error: 'Missing "metadata" object.' });
        }

        // ensure timestamps look like UTC ISO strings
        const badTs = docs
            .map(d => d.timestamp)
            .filter(ts => typeof ts !== 'string' || !ts.endsWith('Z'));
        if (badTs.length > 0) {
            return res.status(400).json({ error: 'All document timestamps must be UTC ISO strings ending with "Z".' });
        }

        const r1 = await collection.insertMany(docs, { ordered: true });
        const r2 = await collection.insertOne({ ...metadata });

        res.json({
            message: 'Insert complete',
            insertedDocs: r1.insertedCount,
            insertedMetadata: r2.insertedId ? 1 : 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Insert failed' });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
