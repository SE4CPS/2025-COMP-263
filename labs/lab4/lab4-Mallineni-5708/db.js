import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
let db;
export async function initMongo() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.MONGO_DB);
  }
  return db;
}
export function readingsColl() {
  return db.collection(process.env.MONGO_COLL);
}
export async function closeMongo() {
  await client.close();
}
