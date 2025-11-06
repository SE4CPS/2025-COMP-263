import dotenv from "dotenv";
import { connectMongo, coll } from "./services/mongo.js";
import { nanoid } from "nanoid";
dotenv.config();
function rnd(a,b){ return +(Math.random()*(b-a)+a).toFixed(2); }
const units = ["ppm","C","F","RH","kPa"];
const author = process.env.AUTHOR || "Sai Manne";
const now = ()=> new Date().toISOString();
async function run(){
  await connectMongo();
  const docs = [];
  for(let i=0;i<2100;i++){
    const sid = "M-"+nanoid(7);
    docs.push({ sensorId:sid, reading:rnd(5,95), unit:units[i%units.length], updatedAt: now(), meta:{ author } });
  }
  await coll().insertMany(docs);
  console.log("inserted", docs.length);
  process.exit(0);
}
run();
