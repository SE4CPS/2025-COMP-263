import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import { initMongo, readingsColl } from "./db.js";
import { initRedis, redis } from "./cache.js";
import { nanoid } from "nanoid";
dotenv.config();
const app = express();
app.use(express.json());
app.use(morgan("dev"));

let writeBehindQueue = [];
let flusher;

function keyFor(id){ return `reading:${id}`; }

async function getFromDb(id){ 
  const doc = await readingsColl().findOne({ sensorId: id }, { projection: { _id: 0 } });
  return doc;
}

app.get("/health", async(req,res)=>{
  try{
    await initMongo();
    await initRedis();
    const pong = await redis().ping();
    res.json({ mongo:true, redis:pong });
  }catch(e){ res.status(500).json({ error:e.message }); }
});

app.get("/readings/cache-aside/:id", async (req,res)=>{
  await initMongo(); await initRedis();
  const id = req.params.id;
  const k = keyFor(id);
  let val = await redis().get(k);
  if(val){ return res.json({ source:"cache", data: JSON.parse(val) }); }
  const doc = await getFromDb(id);
  if(doc){ await redis().set(k, JSON.stringify(doc)); }
  res.json({ source:"db", data: doc });
});

app.get("/readings/read-through/:id", async (req,res)=>{
  await initMongo(); await initRedis();
  const id = req.params.id;
  const k = keyFor(id);
  let val = await redis().get(k);
  if(val){ return res.json({ source:"cache", data: JSON.parse(val) }); }
  const doc = await getFromDb(id);
  if(doc){ await redis().set(k, JSON.stringify(doc)); }
  res.json({ source:"db-through", data: doc });
});

app.get("/readings/ttl/:id", async (req,res)=>{
  await initMongo(); await initRedis();
  const id = req.params.id;
  const k = keyFor(id);
  let val = await redis().get(k);
  if(val){ return res.json({ source:"cache", data: JSON.parse(val) }); }
  const doc = await getFromDb(id);
  if(doc){ await redis().setEx(k, parseInt(process.env.TTL_SECONDS||"30"), JSON.stringify(doc)); }
  res.json({ source:"db-ttl", data: doc });
});

app.post("/readings/write-through", async (req,res)=>{
  await initMongo(); await initRedis();
  const body = req.body;
  await readingsColl().updateOne({ sensorId: body.sensorId }, { $set: body }, { upsert:true });
  await redis().set(keyFor(body.sensorId), JSON.stringify(body));
  res.json({ ok:true });
});

app.post("/readings/write-behind", async (req,res)=>{
  await initMongo(); await initRedis();
  const body = req.body;
  await redis().set(keyFor(body.sensorId), JSON.stringify(body));
  writeBehindQueue.push(body);
  res.json({ queued:true, queueLength: writeBehindQueue.length });
});

app.post("/seed-one", async (req,res)=>{
  await initMongo();
  const body = req.body;
  await readingsColl().insertOne(body);
  res.json({ ok:true });
});

app.get("/bench/:strategy/:id", async (req,res)=>{
  await initMongo(); await initRedis();
  const id = req.params.id;
  const strategy = req.params.strategy;
  let t0 = Date.now();
  let out;
  if(strategy==="cache-aside"){ out = await (await fetch(`http://localhost:${process.env.PORT||4004}/readings/cache-aside/${id}`)).json(); }
  else if(strategy==="read-through"){ out = await (await fetch(`http://localhost:${process.env.PORT||4004}/readings/read-through/${id}`)).json(); }
  else if(strategy==="ttl"){ out = await (await fetch(`http://localhost:${process.env.PORT||4004}/readings/ttl/${id}`)).json(); }
  let dt = Date.now()-t0;
  res.json({ ms: dt, out });
});

function startFlusher(){
  const ms = parseInt(process.env.WRITE_BEHIND_FLUSH_MS||"3000");
  flusher = setInterval(async ()=>{
    if(writeBehindQueue.length===0) return;
    const batch = writeBehindQueue.splice(0, writeBehindQueue.length);
    if(batch.length>0){
      const ops = batch.map(b=>({ updateOne:{ filter:{ sensorId:b.sensorId }, update:{ $set:b }, upsert:true }}));
      await readingsColl().bulkWrite(ops);
    }
  }, ms);
}

const port = parseInt(process.env.PORT||"4004");
initMongo().then(()=>initRedis()).then(()=>{
  startFlusher();
  app.listen(port, ()=>console.log("server on", port));
});
