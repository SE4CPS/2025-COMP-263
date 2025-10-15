// lab3-sync.js
// Unified sync: IndexedDB (simulated) + Neo4j --> MongoDB Lake
require('dotenv').config();
const { MongoClient } = require('mongodb');
const neo4j = require('neo4j-driver');
const crypto = require('crypto');

/* ===========================
   ✅ 1. MONGO CONFIG (Your .env)
   =========================== */
const MONGO_HOST = process.env.MONGO_HOST;              // e.g. cluster0.xxxxx.mongodb.net
const MONGO_USER = process.env.MONGO_USER;              // e.g. comp263
const MONGO_PASS = process.env.MONGO_PASS;              // e.g. your password
const MONGO_DB = process.env.MONGO_DB;                  // e.g. Lab3
const MONGO_COLLECTION = process.env.MONGO_LAKE_COLLECTION || "Lake";

// ✅ Build MongoDB URI using your variables
const MONGO_URI = `${process.env.MONGO_HOST}?authSource=admin&retryWrites=true&w=majority`;

/* ===========================
   ✅ 2. NEO4J CONFIG
   =========================== */
const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

if (!NEO4J_URI || !NEO4J_USER || !NEO4J_PASSWORD) {
    console.warn("Warning: NEO4J_ env vars not set. Neo4j part will skip unless provided.");
}

const mongoClient = new MongoClient(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

/* ===========================
   ✅ 3. IndexedDB Simulation (Reuse Lab-2 Data Logic)
   =========================== */
function buildIndexedDBObjects() {
    const baseObjects = Array.from({ length: 10 }, (_, i) => i + 1).map(id => ({
        id,
        sensorId: "S" + id,
        reading: Math.floor(Math.random() * 100),
        timestamp: new Date(Date.now() + id * 1000).toISOString(),
        notes: "Record for sensor " + id
    }));

    const metadata = {
        author: "Pavan Sriram Kodati",
        last_sync: new Date().toISOString(),
        uuid_source: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)
    };

    const preparedObjects = baseObjects.map(obj => ({
        ...obj,
        timestamp: new Date(obj.timestamp).toISOString(),
        metadata
    }));

    // Add Lab-3 metadata
    const ingestedAt = new Date().toISOString();
    const indexedDocs = preparedObjects.map(obj => ({
        ...obj,
        sourceDB: "IndexedDB",
        ingestedAt,
        Author_Name: "Pavan Sriram Kodati",
        tags: ["sensor", "lab2", `sensor-${obj.sensorId}`]
    }));

    return indexedDocs;
}

/* ===========================
   ✅ 4. Fetch Neo4j Data
   =========================== */
async function fetchNeo4jDocs() {
    if (!NEO4J_URI || !NEO4J_USER || !NEO4J_PASSWORD) {
        console.error("Neo4j env vars missing. Skipping Neo4j fetch.");
        return [];
    }

    const driver = neo4j.driver(
        NEO4J_URI,
        neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
    );
    const session = driver.session({ defaultAccessMode: neo4j.session.READ });

    const query = `
    MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
    RETURN f.name AS farmName, d.type AS deviceType, r.value AS readingValue
    LIMIT 100
  `;

    try {
        const result = await session.run(query);
        const ingestedAt = new Date().toISOString();

        return result.records.map((record, i) => {
            const farmName = record.get("farmName");
            const deviceType = record.get("deviceType");
            const readingValue = record.get("readingValue");

            const docId = `neo4j-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${i}`}`;

            return {
                _id: docId,
                farmName,
                deviceType,
                readingValue,
                sourceDB: "Neo4j",
                ingestedAt,
                Author_Name: "Pavan Sriram Kodati",
                tags: ["agriculture", "neo4j", deviceType || "device-unknown"]
            };
        });

    } catch (err) {
        console.error("Error querying Neo4j:", err.message || err);
        return [];
    } finally {
        await session.close();
        await driver.close();
    }
}

/* ===========================
   ✅ 5. Insert to MongoDB Lake
   =========================== */
async function insertIntoMongo(allDocs) {
    try {
        await mongoClient.connect();
        console.log("Connected to MongoDB.");

        const db = mongoClient.db(MONGO_DB);
        const collection = db.collection(MONGO_COLLECTION);

        if (!Array.isArray(allDocs) || allDocs.length === 0) {
            console.log("No documents to insert.");
            return;
        }

        const ops = allDocs.map(doc => {
            if (doc._id) {
                return {
                    replaceOne: {
                        filter: { _id: doc._id },
                        replacement: doc,
                        upsert: true
                    }
                };
            } else {
                return { insertOne: { document: doc } };
            }
        });

        const result = await collection.bulkWrite(ops, { ordered: false });
        console.log("Mongo bulkWrite result:", result.result || result);

        const count = await collection.countDocuments();
        console.log(`Collection '${MONGO_COLLECTION}' total documents: ${count}`);

    } catch (err) {
        console.error("MongoDB error:", err);
    } finally {
        await mongoClient.close();
        console.log("Mongo client closed.");
    }
}

/* ===========================
   ✅ 6. MAIN RUNNER
   =========================== */
(async function main() {
    console.log("🚀 Starting Lab3 sync...");

    // IndexedDB simulation
    const indexedDocs = buildIndexedDBObjects();
    console.log(`✅ Built ${indexedDocs.length} IndexedDB documents.`);

    // Neo4j docs
    const neo4jDocs = await fetchNeo4jDocs();
    console.log(`✅ Fetched ${neo4jDocs.length} Neo4j documents.`);

    // Combine
    const allDocs = [...indexedDocs, ...neo4jDocs];
    console.log(`✅ Preparing to insert ${allDocs.length} total documents into Mongo collection '${MONGO_COLLECTION}'.`);

    await insertIntoMongo(allDocs);

    console.log("✅ Lab3 sync complete!");
})();
