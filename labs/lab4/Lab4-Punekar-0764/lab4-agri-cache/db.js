import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGO_DB || "comp263";
const collName = process.env.MONGO_COLL || "c4paJkdsceytNEbr";

const mongoClient = new MongoClient(uri, { maxPoolSize: 10 });

let db, readings;

export async function connectMongo() {
  if (db) return { db, readings };
  await mongoClient.connect();
  db = mongoClient.db(dbName);
  readings = db.collection(collName);
  await readings.createIndex({ sensorId: 1, updatedAt: -1 });
  return { db, readings };
}
