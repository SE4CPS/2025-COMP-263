// seed.js
const { MongoClient } = require("mongodb");

// put the real password in <password>
const uri = "mongodb+srv://comp263:c4paJkdsceytNEbr@lab2cluster.yub3wro.mongodb.net/";
const client = new MongoClient(uri);

const round = (x, p = 2) => Math.round(x * 10 ** p) / 10 ** p;
const pad = (n, w) => String(n).padStart(w, "0");

(async () => {
  try {
    await client.connect();
    const db = client.db("Project1");
    const col = db.collection("Readings");

    const base = new Date(); // now (UTC)
    const docs = [];

    for (let i = 1; i <= 50; i++) {
      const deviceNum = pad(i, 3);                 // 001..050
      const farmNum = pad(Math.ceil(i / 10), 2);   // 01..05

      const ts = new Date(base.getTime() - i * 60000).toISOString(); // UTC string

      docs.push({
        deviceId: `sensor-${deviceNum}`,           // string
        farmId: `farm-${farmNum}`,                 // string
        sensor: {
          tempC: round(20 + Math.random() * 10),   // number
          moisture: round(30 + Math.random() * 20),
          humidity: round(50 + Math.random() * 20)
        },
        gps: {
          lat: round(37 + Math.random(), 6),       // number
          lon: round(-121 + Math.random(), 6)      // number
        },
        note: `Auto-generated reading #${i}`,       // string
        timestamp: ts,                              // UTC string
        ingestedAt: new Date()  ,
        author: `Omkar`                    // BSON Date (current UTC)
      });
    }

    const res = await col.insertMany(docs, { ordered: true });
    console.log(`Inserted: ${res.insertedCount}`);
  } catch (e) {
    // Show the exact validation failure path if any
    const first =
      e?.result?.writeErrors?.[0]?.err?.errInfo?.details ||
      e?.writeErrors?.[0]?.err?.errInfo?.details ||
      e;
    console.dir(first, { depth: 10 });
  } finally {
    await client.close();
  }
})();
