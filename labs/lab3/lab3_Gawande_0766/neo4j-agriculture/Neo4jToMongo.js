const neo4j = require("neo4j-driver");
const { MongoClient } = require("mongodb");

const driver = neo4j.driver("bolt://127.0.0.1:7687",
                            neo4j.auth.basic("neo4j","12345678"));
const mongoClient = new MongoClient("mongodb+srv://i40:dbms2@cluster0.lixbqmp.mongodb.net/");
const dbName = "Project1";
const collectionName = "lake";

async function run() {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (f:Farm)-[:HAS_DEVICE]->(d:Device)-[:GENERATES]->(r:Reading)
      RETURN f.name AS farm, d.type AS device, r.value AS reading
    `);
    const docs = result.records.map(r => ({
  farm: r.get("farm"),
  device: r.get("device"),
  reading: r.get("reading"),
  sourceDB: "Neo4j",
  ingestedAt: new Date().toISOString(),
  tags: ["agriculture", "iot", "farm"],
  farmerName: "Utkarsh Gawande"
}));

    await mongoClient.connect();
    const db = mongoClient.db(dbName);
    const col = db.collection(collectionName);
    await col.insertMany(docs);

    console.log("✅ Neo4j data inserted into MongoDB Atlas");
  } finally {
    await session.close();
    await driver.close();
    await mongoClient.close();
  }
}
run();
