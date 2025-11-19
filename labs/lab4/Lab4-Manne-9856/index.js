import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectMongo, coll } from "./services/mongo.js";
import { connectRedis, r } from "./services/redis.js";
dotenv.config();
const app = express();
app.use(express.json());
app.use(morgan("tiny"));
const key = id => `sread:${id}`;
let wbq = [];
let flusher;
async function ensure(){
  await connectMongo();
  await connectRedis();
  if(!flusher){
    const ms = parseInt(process.env.WRITE_BEHIND_FLUSH_MS || "2500");
    flusher = setInterval(async ()=>{
      if(wbq.length===0) return;
      const b = wbq.splice(0, wbq.length);
      const ops = b.map(x => ({ updateOne: { filter:{ sensorId:x.sensorId }, update:{ $set:x }, upsert:true } }));
      await coll().bulkWrite(ops);
    }, ms);
  }
}
app.get("/api/util/health", async (req,res)=>{
  try{
    await ensure();
    const pong = await r().ping();
    res.json({ mongo:true, redis:pong });
  }catch(e){ res.status(500).json({ error:e.message }); }
});
async function fromDb(id){ return await coll().findOne({ sensorId:id }, { projection:{ _id:0 } }); }
app.get("/api/get/cache-aside/:id", async (req,res)=>{
  await ensure();
  const k = key(req.params.id);
  const v = await r().get(k);
  if(v){ return res.json({ source:"cache", data: JSON.parse(v) }); }
  const d = await fromDb(req.params.id);
  if(d){ await r().set(k, JSON.stringify(d)); }
  res.json({ source:"db", data:d });
});
app.get("/api/get/read-through/:id", async (req,res)=>{
  await ensure();
  const k = key(req.params.id);
  const v = await r().get(k);
  if(v){ return res.json({ source:"cache", data: JSON.parse(v) }); }
  const d = await fromDb(req.params.id);
  if(d){ await r().set(k, JSON.stringify(d)); }
  res.json({ source:"db-through", data:d });
});
app.get("/api/get/ttl/:id", async (req,res)=>{
  await ensure();
  const k = key(req.params.id);
  const v = await r().get(k);
  if(v){ return res.json({ source:"cache", data: JSON.parse(v) }); }
  const d = await fromDb(req.params.id);
  if(d){ await r().setEx(k, parseInt(process.env.TTL_SECONDS||"25"), JSON.stringify(d)); }
  res.json({ source:"db-ttl", data:d });
});
app.post("/api/write/through", async (req,res)=>{
  await ensure();
  await coll().updateOne({ sensorId:req.body.sensorId }, { $set:req.body }, { upsert:true });
  await r().set(key(req.body.sensorId), JSON.stringify(req.body));
  res.json({ ok:true });
});
app.post("/api/write/behind", async (req,res)=>{
  await ensure();
  await r().set(key(req.body.sensorId), JSON.stringify(req.body));
  wbq.push(req.body);
  res.json({ queued:true, n: wbq.length });
});
app.post("/api/util/seed-one", async (req,res)=>{
  await ensure();
  await coll().insertOne(req.body);
  res.json({ ok:true });
});
const port = parseInt(process.env.PORT || "4015");
app.listen(port, ()=> console.log("up", port));
