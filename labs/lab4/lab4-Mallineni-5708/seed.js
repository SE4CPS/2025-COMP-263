import dotenv from "dotenv";
import { initMongo, readingsColl } from "./db.js";
import { nanoid } from "nanoid";
dotenv.config();
function rand(min,max){ return +(Math.random()*(max-min)+min).toFixed(2); }
const units = ["C","F","PPM","RH"];
const author = process.env.AUTHOR || "Ram Mallineni";
const now = ()=>new Date().toISOString();
async function run(){
  await initMongo();
  const docs = [];
  for(let i=0;i<2000;i++){
    const sid = "S-"+nanoid(8);
    docs.push({ sensorId:sid, reading:rand(10,100), unit:units[i%units.length], updatedAt: now(), meta:{ author } });
  }
  await readingsColl().insertMany(docs);
  console.log("inserted", docs.length);
  process.exit(0);
}
run();
