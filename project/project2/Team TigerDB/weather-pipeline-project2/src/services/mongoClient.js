const { MongoClient } = require("mongodb");
const { mongoUri, mongoDb } = require("../config");

let client;
let db;

async function getMongoDb() {
  if (!client) {
    client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db(mongoDb);
  }
  return db;
}

module.exports = { getMongoDb };
