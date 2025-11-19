import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
console.log("Connected to MongoDB");

const db = client.db(process.env.DB_NAME);
const readingsColl = db.collection("readings");
const metaColl = db.collection("metadata");

// Provide env values to the client
app.get("/env.js", (_req, res) => {
  res.type("application/javascript").send(
    `window.ENV=${JSON.stringify({
      API_URL: process.env.API_URL,
      AUTHOR: process.env.AUTHOR,
      UUID_SOURCE: process.env.UUID_SOURCE
    })};`
  );
});

// Endpoint to receive data from browser and save to Mongo
app.post("/ingest", async (req, res) => {
  try {
    const payload = req.body;
    if (payload.metadata) {
      await metaColl.updateOne(
        { key: "metadata" },
        { $set: payload.metadata },
        { upsert: true }
      );
    }
    if (payload.readings) {
      await readingsColl.insertMany(payload.readings);
    }
    res.json({ ok: true, inserted: payload.readings?.length || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`Server running at http://localhost:${process.env.PORT}`)
);
