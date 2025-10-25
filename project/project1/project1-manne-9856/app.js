const express = require("express");
const { MongoClient } = require("mongodb");
const app = express();
app.use(express.json());
const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const client = new MongoClient(uri);
let coll = null;
async function init(){
  await client.connect();
  coll = client.db("Project1").collection("Readings");
  console.log("db ok");
}
function toInt(v, d){const n = parseInt(v, 10);return Number.isFinite(n)?n:d;}
app.post("/readings", async (req,res)=>{
  try{
    const doc = Object.assign({}, req.body, { ingestedAt: new Date().toISOString(), author: "Sai Manne" });
    const r = await coll.insertOne(doc);
    res.status(201).json({ id: r.insertedId, ok: true });
  }catch(e){res.status(500).json({ error: e.message });}
});
app.get("/readings", async (req,res)=>{
  try{
    const since = toInt(req.query.since, 30);
    const limit = toInt(req.query.limit, 10);
    const minISO = new Date(Date.now()-since*24*60*60*1000).toISOString();
    const data = await coll.find({ timestamp: { $gte: minISO }, author: "Sai Manne" })
      .sort({ timestamp: -1 }).limit(limit).toArray();
    res.json({ count: data.length, items: data });
  }catch(e){res.status(500).json({ error: e.message });}
});
app.get("/stats/basic", async (req,res)=>{
  try{
    const f = req.query.farmId;
    const match = { author: "Sai Manne" };
    if(f) match.farmId = f;
    const cur = coll.aggregate([
      { $match: match },
      { $group: {
          _id: null,
          total: { $sum: 1 },
          avgTemp: { $avg: { $toDouble: "$sensor.tempC" } },
          avgMoisture: { $avg: { $toDouble: "$sensor.moisture" } },
          avgHumidity: { $avg: { $toDouble: "$sensor.humidity" } },
          last: { $max: "$timestamp" }
      } }
    ]);
    const a = await cur.toArray();
    res.json(a[0] || { total: 0 });
  }catch(e){res.status(500).json({ error: e.message });}
});
const PORT = 3000;
init().then(()=> app.listen(PORT, ()=>console.log(`http://localhost:${PORT}`))).catch(e=>{console.error(e);process.exit(1);});
