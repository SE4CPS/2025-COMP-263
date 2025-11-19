import dotenv from "dotenv";
import http from "http";
dotenv.config();
const TARGET = `http://localhost:${process.env.PORT||3000}/cache-aside/sensor-010`;

function once(){
  const t0 = performance.now();
  return new Promise((resolve,reject)=>{
    http.get(TARGET, res=>{
      res.on("data",()=>{});
      res.on("end",()=>resolve(performance.now()-t0));
    }).on("error",reject);
  });
}
async function run(label,n=25){
  const times=[]; for(let i=0;i<n;i++) times.push(await once());
  const avg = times.reduce((a,b)=>a+b,0)/times.length;
  console.log(`${label}: avg=${avg.toFixed(2)} ms  samples=${n}`);
}
(async ()=>{
  console.log("Cold:"); await run("cold",10);
  console.log("Warm:"); await run("warm",25);
  const ttl = Number(process.env.DEFAULT_TTL_SECONDS||60);
  await new Promise(r=>setTimeout(r,(ttl+2)*1000));
  console.log("Post-expire:"); await run("post-expire",10);
})();
