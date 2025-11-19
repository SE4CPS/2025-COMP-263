const { MongoClient } = require("mongodb");
const uri =
  "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const client = new MongoClient(uri);
function pick(a) {
  return a[Math.floor(Math.random() * a.length)];
}
function f(n, x = 2) {
  return parseFloat(n.toFixed(x));
}
function lat() {
  return f(Math.random() * 180 - 90, 6);
}
function lon() {
  return f(Math.random() * 360 - 180, 6);
}
function daysAgo(d) {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}
async function run() {
  await client.connect();
  const coll = client.db("Project1").collection("Readings");
  const devices = Array.from(
    { length: 7 },
    (_, i) => `sx-${String(i + 1).padStart(3, "0")}`
  );
  const farms = ["alpha", "beta", "gamma", "delta"];
  const out = [];
  for (let i = 0; i < 50; i++) {
    const ts = new Date(daysAgo(Math.random() * 30)).toISOString();
    out.push({
      deviceId: pick(devices),
      farmId: pick(farms),
      sensor: {
        tempC: f(12 + Math.random() * 28),
        moisture: f(Math.random() * 100),
        humidity: f(Math.random() * 100),
      },
      gps: { lat: lat(), lon: lon() },
      note: `r${i + 1}`,
      timestamp: ts,
      ingestedAt: new Date().toISOString(),
      author: "Sai Manne",
    });
  }
  const r = await coll.insertMany(out);
  console.log(r.insertedCount || Object.keys(r.insertedIds).length);
  console.log(out[0]);
  await client.close();
}
run().catch(async (e) => {
  console.error(e.message);
  await client.close();
});
