import dotenv from "dotenv";
import fs from "fs";
import { initMongo, readingsColl } from "./db.js";
import { initRedis, redis } from "./cache.js";
dotenv.config();
const port = parseInt(process.env.PORT||"4004");

function mean(arr){ return arr.reduce((a,b)=>a+b,0)/arr.length; }

async function timeCall(url){
  const t0 = Date.now();
  const r = await fetch(url);
  await r.json();
  return Date.now()-t0;
}

async function benchFor(id, strategy, trials){
  const times = [];
  await redis().del(`reading:${id}`);
  for(let i=0;i<trials;i++){
    const ms = await timeCall(`http://localhost:${port}/readings/${strategy}/${id}`);
    times.push(ms);
  }
  return { strategy, cold: times[0], mean_ms: Math.round(mean(times.slice(1))) };
}

async function ensureOne(){
  await initMongo(); await initRedis();
  let doc = await readingsColl().findOne({}, { projection:{ _id:0 } });
  if(!doc){
    doc = { sensorId:"S-EX", reading:42.2, unit:"C", updatedAt:new Date().toISOString(), meta:{ author: process.env.AUTHOR || "Ram Mallineni" } };
    await readingsColl().insertOne(doc);
  }
  return doc.sensorId;
}

async function run(){
  await initMongo(); await initRedis();
  await fs.promises.mkdir("bench-output", { exist_ok: true });
  const sid = await ensureOne();
  const strategies = ["cache-aside","read-through","ttl"];
  const rows = [];
  for(const s of strategies){
    const r = await benchFor(sid, s, 6);
    rows.push(r);
  }
  const csv = ["strategy,cold_ms,warm_mean_ms"].concat(rows.map(x=>`${x.strategy},${x.cold},${x.mean_ms}`)).join("\n");
  await fs.promises.writeFile("bench-output/results.csv", csv);
  console.table(rows);
  console.log("saved bench-output/results.csv");
  process.exit(0);
}
run();
