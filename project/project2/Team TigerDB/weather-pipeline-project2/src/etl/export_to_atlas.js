const { MongoClient } = require("mongodb");

const atlasUri = "mongodb+srv://i40:dbms2@cluster0.lixbqmp.mongodb.net/";
const atlasDb = "Project2";

async function exportToAtlas(rawDocs, enrichedDocs) {
  const client = new MongoClient(atlasUri);
  await client.connect();

  const db = client.db(atlasDb);

  const annotatedRaw = rawDocs.map((d) => ({
    ...d,
    metadata: {
      ...(d.metadata || {}),
      team: "TigerDB",
      author: "Ram Mallineni, Sai Manne",
    },
  }));

  const annotatedEnriched = enrichedDocs.map((d) => ({
    ...d,
    metadata: {
      ...(d.metadata || {}),
      team: "TigerDB",
      author: "Ram Mallineni, Sai Manne",
    },
  }));

  await db.collection("raw_observations").insertMany(annotatedRaw);
  await db.collection("enriched_observations").insertMany(annotatedEnriched);

  await client.close();
}

module.exports = { exportToAtlas };
