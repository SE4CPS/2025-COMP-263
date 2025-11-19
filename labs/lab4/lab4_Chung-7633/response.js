const axios = require("axios");
const { execSync } = require("child_process");

const BASE = "http://localhost:3000";
const SENSOR = process.argv[2] || "S0001";

async function hit(url, n=1) {
  const times = [];
  for (let i=0; i<n; i++) {
    const r = await axios.get(url);

    const hdr = r.headers["x-response-time"];
    let ms = null;
    if (hdr && hdr.endsWith("ms")) ms = Number(hdr.replace("ms",""));
    else if (typeof r.data?.timeMs === "number") ms = r.data.timeMs;
    else ms = 0;
    times.push(ms);
  }
  const avg = times.reduce((a,b)=>a+b,0) / times.length;
  return {avg: Number(avg.toFixed(2)), samples: times};
}

function flushRedis() {
  try { execSync(`redis-cli flushall`); } catch {}
}

(async () => {
  console.log(`Benchmark sensorId=${SENSOR}\n`);

  // 1) Baseline Mongo
  flushRedis();
  const mongoCold = await hit(`${BASE}/baseline/${SENSOR}`, 10);

  // 2) Cache-Aside
  flushRedis();
  const caCold = await hit(`${BASE}/cache-aside/${SENSOR}`, 1);
  const caWarm = await hit(`${BASE}/cache-aside/${SENSOR}`, 20);

  // 3) Read-Through
  flushRedis();
  const rtCold = await hit(`${BASE}/read-through/${SENSOR}`, 1);
  const rtWarm = await hit(`${BASE}/read-through/${SENSOR}`, 20);

  // 4) TTL
  flushRedis();
  const ttlPrime = await hit(`${BASE}/ttl/${SENSOR}`, 1);
  const ttlWarm = await hit(`${BASE}/ttl/${SENSOR}`, 10);
  const ttlSec = Number(process.env.CACHE_TTL_SECONDS || 60);
  console.log(`Waiting ${ttlSec}s for TTL to expire...`);
  await new Promise(r => setTimeout(r, ttlSec*1000 + 200));
  const ttlAfterExpire = await hit(`${BASE}/ttl/${SENSOR}`, 1);

const results = [
  { Scenario: "Mongo baseline (no cache)", "Avg latancy (ms)": mongoCold.avg, Notes: `/baseline/${SENSOR}` },
  { Scenario: "Cache-Aside (cold)", "Avg time (ms)": caCold.avg, Notes: "first miss → Mongo" },
  { Scenario: "Cache-Aside (warm)", "Avg time (ms)": caWarm.avg, Notes: "served by Redis" },
  { Scenario: "Read-Through (cold)", "Avg time (ms)": rtCold.avg, Notes: "miss → DB + set" },
  { Scenario: "Read-Through (warm)", "Avg time (ms)": rtWarm.avg, Notes: "served by Redis" },
  { Scenario: "TTL prime (mongo)", "Avg time (ms)": ttlPrime.avg, Notes: "first set with TTL" },
  { Scenario: "TTL warm (cache)", "Avg time (ms)": ttlWarm.avg, Notes: "within TTL" },
  { Scenario: "TTL after expire (mongo)", "Avg time (ms)": ttlAfterExpire.avg, Notes: "TTL expired" },
];
console.table(results);
})();