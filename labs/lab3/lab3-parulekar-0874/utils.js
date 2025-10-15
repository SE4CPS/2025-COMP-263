// labs/lab4/integrateIndexedDB_Neo4j_to_Mongo.js
// Run with: node labs/lab4/integrateIndexedDB_Neo4j_to_Mongo.js

const { MongoClient } = require("mongodb");
const neo4j = require("neo4j-driver");

// ---------- Configuration ----------
const MONGO_URI = "mongodb://jdUser:MySecurePass123@ac-xxxxx-shard-00-00.x7a9m.mongodb.net:27017,ac-xxxxx-shard-00-01.x7a9m.mongodb.net:27017,ac-xxxxx-shard-00-02.x7a9m.mongodb.net:27017/?ssl=true&replicaSet=atlas-x7a9m-shard-0&authSource=admin&retryWrites=true&w=majority";
const NEO4J_URI = "neo4j+s://7bc0170a.databases.neo4j.io";
const NEO4J_USER = "neo4j";
const NEO4J_PASS = "8QKjaQU-B9oBvXHWm_Oy0m2Yj8JffBMUE-Y9OkpqNcE";

// ---------- MongoDB Connection ----------
const mongoClient = new MongoClient(MONGO_URI);

// ---------- Neo4j Connection ----------
const neo4jDriver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASS)
);

// ---------- Simulated IndexedDB Data ----------
const indexedDBData = [
  { field: "NorthFarm-A1", crop: "Wheat", moisture: 25.3, temp: 31.8 },
  { field: "SouthFarm-B4", crop: "Rice", moisture: 29.1, temp: 27.4 },
];

const indexedDBDocs = indexedDBData.map((item) => ({
  ...item,
  sourceDB: "IndexedDB",
  ingestedAt: new Date().toISOString(),
  tags: ["field-sensor", "local-cache", "agriculture"],
}));

// ---------- Utility: Safe Property Access ----------
function safeProp(node, key, fallback = "N/A") {
  try {
    return node?.properties?.[key] ?? fallback;
  } catch {
    return fallback;
  }
}

// ---------- Fetch Neo4j Data ----------
async function fetchNeo4jData() {
  const session = neo4jDriver.session();
  try {
    const query = `
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f, d, r
    `;
    const result = await session.run(query);

    return result.records.map((record) => ({
      farm: safeProp(record.get("f"), "name"),
      deviceType: safeProp(record.get("d"), "type"),
      readingValue: safeProp(record.get("r"), "value"),
      readingTimestamp: safeProp(record.get("r"), "timestamp"),
      sourceDB: "Neo4j",
      ingestedAt: new Date().toISOString(),
      tags: ["graph-data", "sensor", "agriculture"],
    }));
  } catch (err) {
    console.error("❌ Error fetching Neo4j data:", err.message);
    return [];
  } finally {
    await session.close();
  }
}

// ---------- Push Both Sources to MongoDB ----------
async function pushToMongo() {
  try {
    console.log("🌱 Connecting to MongoDB...");
    await mongoClient.connect();

    const db = mongoClient.db("agriDataLake");
    const collection = db.collection("integrated_data");

    console.log("🌾 Fetching data from Neo4j...");
    const neo4jDocs = await fetchNeo4jData();

    console.log("🪣 Preparing to insert combined data...");
    const allDocs = [...indexedDBDocs, ...neo4jDocs];

    if (allDocs.length === 0) {
      console.warn("⚠️ No data to insert.");
      return;
    }

    const result = await collection.insertMany(allDocs);
    console.log(`✅ Inserted ${result.insertedCount} documents into MongoDB Data Lake.`);
  } catch (err) {
    console.error("❌ Integration failed:", err);
  } finally {
    await mongoClient.close();
    await neo4jDriver.close();
    console.log("🔚 Connections closed.");
  }
}

// ---------- Run Integration ----------
pushToMongo();
