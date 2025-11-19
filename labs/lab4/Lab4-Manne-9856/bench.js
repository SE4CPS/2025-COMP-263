import dotenv from "dotenv";
import fs from "fs";
import { connectMongo, coll } from "./services/mongo.js";
import { connectRedis, r } from "./services/redis.js";
dotenv.config();
const port = parseInt(process.env.PORT||"4015");
function mean(a){ return a.reduce((x,y)=>x+y,0)/a.length; }
async function t(u){ const t0=Date.now(); const res = await fetch(u); await res.json(); return Date.now()-t0; }
async function ensureOne(){
  await connectMongo(); await connectRedis();
  let d = await coll().findOne({}, { projection:{ _id:0, sensorId:1 } });
  if(!d){ d = { sensorId:"M-EX1", reading:41.1, unit:"C", updatedAt:new Date().toISOString(), meta:{ author: process.env.AUTHOR||"Sai Manne" } }; await coll().insertOne(d); }
  return d.sensorId;
}
async function run(){
  await connectMongo(); await connectRedis();
  await fs.promises.mkdir("bench_out", { exist_ok:true });
  const id = await ensureOne();
  const s = ["cache-aside","read-through","ttl"];
  const rows=[];
  for(const k of s){
    await r().del(`sread:${id}`);
    const arr=[];
    for(let i=0;i<6;i++){ arr.push(await t(`http://localhost:${port}/api/get/${k}/${id}`)); }
    rows.push({ strategy:k, cold_ms:arr[0], warm_mean_ms: Math.round(mean(arr.slice(1))) });
  }
  const csv = ["strategy,cold_ms,warm_mean_ms"].concat(rows.map(o=>`${o.strategy},${o.cold_ms},${o.warm_mean_ms}`)).join("\n");
  await fs.promises.writeFile("bench_out/results_manne.csv", csv);
  console.table(rows);
  console.log("saved bench_out/results_manne.csv");
  process.exit(0);
}
run();
