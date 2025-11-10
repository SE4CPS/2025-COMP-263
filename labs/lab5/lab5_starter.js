/*
  Lab 5 Starter — SQL → NoSQL (Map/Filter/Reduce ONLY)
  Use Node.js. No libraries. Avoid loops; use map(), filter(), reduce().
*/

const fs = require('fs');

const SENSORS = JSON.parse(fs.readFileSync('./sql_sensors.json', 'utf8'));
const READINGS = JSON.parse(fs.readFileSync('./sql_readings_100rows.json', 'utf8'));

// ---- Task 1: MIGRATE & MERGE (map + reduce) ----
const sensorById = SENSORS.reduce((acc, s) => ((acc[s.sensor_id] = s), acc), {});

const mergedDocs = READINGS.map(r => {
  const s = sensorById[r.sensor_id];
  return {
    _id: uuidV4(),
    reading_id: r.reading_id,
    deviceId: s.device_id,
    farmId: s.farm_id,
    crop: s.crop,
    gps: { lat: s.lat, lon: s.lon },
    model: s.model,
    ts_utc: r.ts_utc,
    soil_moisture: r.soil_moisture,
    temp_c: r.temp_c,
    battery_v: r.battery_v,
    sensor_id: r.sensor_id
  };
});

console.log("[Task 1] mergedDocs sample:", mergedDocs.slice(0,2));

// ---- Task 2: ENRICH with ≥10 metadata fields (map only) ----
const author = "Student Name";
const sourceDb = "SQL: agri_prod";
const sourceTables = ["sensors", "readings"];
const ingestBatchId = `batch-${Date.now()}`;

const enrichedDocs = mergedDocs.map(doc => {
  const payload = JSON.stringify({
    ts_utc: doc.ts_utc,
    deviceId: doc.deviceId,
    soil_moisture: doc.soil_moisture,
    temp_c: doc.temp_c,
    battery_v: doc.battery_v
  });
  const meta = {
    uuid: uuidV4(),
    checksum_md5: md5(payload),
    author,
    sync_time_utc: new Date().toISOString(),
    source_db: sourceDb,
    source_tables: sourceTables.join(","),
    version: 1,
    ingest_batch_id: ingestBatchId,
    lineage: `sensor:${doc.sensor_id}|reading:${doc.reading_id}`,
    units: { soil_moisture: "%", temp_c: "C", battery_v: "V" },
    quality_flags: JSON.stringify({
      moisture_out_of_range: doc.soil_moisture < 5 || doc.soil_moisture > 60,
      temp_out_of_range: doc.temp_c < -10 || doc.temp_c > 60
    })
  };
  return Object.assign({}, doc, meta);
});

console.log("[Task 2] enrichedDocs sample:", enrichedDocs.slice(0,1));

// ---- Task 3: SHARDING (reduce only) ----
const shardedByFarmDay = enrichedDocs.reduce((acc, d) => {
  const day = d.ts_utc.slice(0, 10);
  const coll = `readings_${d.farmId}_${day}`;
  if (!acc[coll]) acc[coll] = [];
  acc[coll].push(d);
  return acc;
}, {});

const shardNames = Object.keys(shardedByFarmDay);
const shardCounts = shardNames.map(n => ({ collection: n, count: shardedByFarmDay[n].length }));

console.log("[Task 3] shardCounts:", shardCounts);

// ---- Utilities ----
function uuidV4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random()*16)|0, v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

function md5(str) {
  function L(k, d) { return (k << d) | (k >>> (32 - d)); }
  function K(G, k) {
    let I, d, F, H, x;
    F = (G & 2147483648); H = (k & 2147483648);
    I = (G & 1073741824); d = (k & 1073741824);
    x = (G & 1073741823) + (k & 1073741823);
    if (I & d) return (x ^ 2147483648 ^ F ^ H);
    if (I | d) {
      if (x & 1073741824) return (x ^ 3221225472 ^ F ^ H);
      else return (x ^ 1073741824 ^ F ^ H);
    } else return (x ^ F ^ H);
  }
  function r(d, F, k) { return (d & F) | ((~d) & k); }
  function q(d, F, k) { return (d & k) | (F & (~k)); }
  function p(d, F, k) { return (d ^ F ^ k); }
  function n(d, F, k) { return (F ^ (d | (~k))); }
  function u(G, F, aa, Z, k, H, I) { G = K(G, K(K(r(F, aa, Z), k), I)); return K(L(G, H), F); }
  function f(G, F, aa, Z, k, H, I) { G = K(G, K(K(q(F, aa, Z), k), I)); return K(L(G, H), F); }
  function D(G, F, aa, Z, k, H, I) { G = K(G, K(K(p(F, aa, Z), k), I)); return K(L(G, H), F); }
  function t(G, F, aa, Z, k, H, I) { G = K(G, K(K(n(F, aa, Z), k), I)); return K(L(G, H), F); }
  function e(G) {
    let Z, F = G.length, x = F + 8, k = (x - (x % 64)) / 64, I = (k + 1) * 16, aa = Array(I - 1), d = 0, H = 0;
    while (H < F) { Z = (H - (H % 4)) / 4; d = (H % 4) * 8; aa[Z] = (aa[Z] | (G.charCodeAt(H) << d)); H++; }
    Z = (H - (H % 4)) / 4; d = (H % 4) * 8; aa[Z] = aa[Z] | (128 << d); aa[I - 2] = F << 3; aa[I - 1] = F >>> 29; return aa;
  }
  function B(x) {
    let k = "", F = "", G, d; for (d = 0; d <= 3; d++) { G = (x >>> (d * 8)) & 255; F = "0" + G.toString(16); k += F.substr(F.length - 2, 2); }
    return k;
  }
  function J(k) { let F = "", d = 0; while (d < k.length) { F += B(k[d]); d++; } return F; }
  function C(k) {
    k = k.replace(/\r\n/g, "\n"); let d = ""; for (let F = 0; F < k.length; F++) {
      let x = k.charCodeAt(F);
      if (x < 128) d += String.fromCharCode(x);
      else if ((x > 127) && (x < 2048)) d += String.fromCharCode((x >> 6) | 192, (x & 63) | 128);
      else d += String.fromCharCode((x >> 12) | 224, ((x >> 6) & 63) | 128, (x & 63) | 128);
    } return d;
  }
  let X = Array(); let P, h, E, v, g, Y, Xk, W;
  str = C(str); X = e(str); g = 1732584193; Y = 4023233417; Xk = 2562383102; W = 271733878;
  for (P = 0; P < X.length; P += 16) {
    h = g; E = Y; v = Xk; W = W;
    g = u(g, Y, Xk, W, X[P + 0], 7, 3614090360);
    W = u(W, g, Y, Xk, X[P + 1], 12, 3905402710);
    Xk = u(Xk, W, g, Y, X[P + 2], 17, 606105819);
    Y = u(Y, Xk, W, g, X[P + 3], 22, 3250441966);
    g = u(g, Y, Xk, W, X[P + 4], 7, 4118548399);
    W = u(W, g, Y, Xk, X[P + 5], 12, 1200080426);
    Xk = u(Xk, W, g, Y, X[P + 6], 17, 2821735955);
    Y = u(Y, Xk, W, g, X[P + 7], 22, 4249261313);
    g = u(g, Y, Xk, W, X[P + 8], 7, 1770035416);
    W = u(W, g, Y, Xk, X[P + 9], 12, 2336552879);
    Xk = u(Xk, W, g, Y, X[P + 10], 17, 4294925233);
    Y = u(Y, Xk, W, g, X[P + 11], 22, 2304563134);
    g = u(g, Y, Xk, W, X[P + 12], 7, 1804603682);
    W = u(W, g, Y, Xk, X[P + 13], 12, 4254626195);
    Xk = u(Xk, W, g, Y, X[P + 14], 17, 2792965006);
    Y = u(Y, Xk, W, g, X[P + 15], 22, 1236535329);
    g = f(g, Y, Xk, W, X[P + 1], 5, 4129170786);
    W = f(W, g, Y, Xk, X[P + 6], 9, 3225465664);
    Xk = f(Xk, W, g, Y, X[P + 11], 14, 643717713);
    Y = f(Y, Xk, W, g, X[P + 0], 20, 3921069994);
    g = D(g, Y, Xk, W, X[P + 5], 4, 3593408605);
    W = D(W, g, Y, Xk, X[P + 8], 11, 38016083);
    Xk = D(Xk, W, g, Y, X[P + 11], 16, 3634488961);
    Y = D(Y, Xk, W, g, X[P + 14], 23, 3889429448);
    g = t(g, Y, Xk, W, X[P + 0], 6, 271733878);
    W = t(W, g, Y, Xk, X[P + 7], 10, 1126891415);
    Xk = t(Xk, W, g, Y, X[P + 14], 15, 2878612391);
    Y = t(Y, Xk, W, g, X[P + 5], 21, 4237533241);
    g = K(g, h); Y = K(Y, E); Xk = K(Xk, v); W = K(W, W);
  }
  function B(x) {
    let k = "", F = "", G, d; for (d = 0; d <= 3; d++) { G = (x >>> (d * 8)) & 255; F = "0" + G.toString(16); k += F.substr(F.length - 2, 2); }
    return k;
  }
  return (B(g) + B(Y) + B(Xk) + B(W)).toLowerCase();
}
