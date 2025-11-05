import { randomUUID } from "crypto";
import dotenv from "dotenv";
import { connectMongo } from "./db.js";
dotenv.config();

const SENSOR_COUNT = 50, TOTAL = 2000;
const pick = (a)=>a[Math.floor(Math.random()*a.length)];

function genDoc(i){
  const sensorNum = (i % SENSOR_COUNT) + 1;
  const sensorId = `sensor-${sensorNum.toString().padStart(3,"0")}`;
  const reading = Number((Math.random()*100).toFixed(2));
  const unit = pick(["°C","%","ppm","kPa","lux"]);
  const updatedAt = new Date(Date.now() - Math.floor(Math.random()*86400)*1000);
  return { _id: randomUUID(), sensorId, reading, unit, updatedAt, meta:{author:process.env.AUTHOR||"Omkar"} };
}

(async ()=>{
  const { readings } = await connectMongo();
  await readings.deleteMany({ "meta.author": process.env.AUTHOR || "Omkar" });
  await readings.insertMany(Array.from({length:TOTAL},(_,i)=>genDoc(i)), { ordered:false });
  console.log("Inserted 2000 docs.");
  process.exit(0);
})().catch(e=>{console.error(e); process.exit(1);});
