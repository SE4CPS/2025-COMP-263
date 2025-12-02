const { getMongoDb } = require("../services/mongoClient");
const { client, ensureSchema } = require("../services/clickhouseClient");
const { syncIntervalMin } = require("../config");

function monthKey(date) {
  const [y, m] = date.split("-");
  return `${y}-${m}-01`;
}

function chDateTime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

async function etlMongoToClickHouse(loadMode = "overwrite") {
  await ensureSchema();
  const db = await getMongoDb();
  const coll = db.collection("weather_daily");

  const latest = await coll.find().sort({ date: -1 }).limit(1).next();
  if (!latest) return;

  const end = new Date(latest.date);
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - 1);

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const cursor = coll.find(
    { date: { $gte: startStr, $lte: endStr } },
    {
      projection: {
        _id: 0,
        date: 1,
        temp_max_c: 1,
        temp_min_c: 1,
        precipitation_mm: 1,
      },
    }
  );

  const buckets = {};

  await cursor.forEach((doc) => {
    const key = monthKey(doc.date);
    if (!buckets[key]) {
      buckets[key] = {
        month: key,
        maxSum: 0,
        minSum: 0,
        precipSum: 0,
        count: 0,
      };
    }
    const b = buckets[key];
    b.maxSum += doc.temp_max_c;
    b.minSum += doc.temp_min_c;
    b.precipSum += doc.precipitation_mm;
    b.count += 1;
  });

  const now = new Date();
  const nowStr = chDateTime(now);

  const rows = Object.values(buckets).map((b) => ({
    month: b.month,
    avg_temp_max_c: b.maxSum / b.count,
    avg_temp_min_c: b.minSum / b.count,
    total_precipitation_mm: b.precipSum,
    warehouse_load_time: nowStr,
    rows_loaded: b.count,
    sync_interval_min: syncIntervalMin,
    load_mode: loadMode,
  }));

  if (loadMode === "overwrite") {
    await client.command({ query: "TRUNCATE TABLE weather_monthly" });
  }

  await client.insert({
    table: "weather_monthly",
    values: rows,
    format: "JSONEachRow",
  });
}

module.exports = { etlMongoToClickHouse };
