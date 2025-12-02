const { client } = require("../services/clickhouseClient");
const { redis } = require("../services/redisClient");
const { syncIntervalMin } = require("../config");

const CACHE_KEY = "weather:monthly";

async function etlClickHouseToRedis() {
  const query = `
    SELECT
      month,
      avg_temp_max_c,
      avg_temp_min_c,
      total_precipitation_mm,
      warehouse_load_time,
      rows_loaded,
      sync_interval_min,
      load_mode
    FROM weather_monthly
    ORDER BY month
  `;

  const result = await client.query({ query, format: "JSONEachRow" });
  const rows = await result.json();

  const now = new Date();
  const payload = {
    generated_at_utc: now.toISOString(),
    refresh_interval_sec: syncIntervalMin * 60,
    data_version: "v_" + Date.now(),
    cache_timestamp: now.toISOString(),
    monthly_stats: rows,
  };

  const ttl = syncIntervalMin * 120;
  await redis.set(CACHE_KEY, JSON.stringify(payload), { EX: ttl });

  return CACHE_KEY;
}

module.exports = { etlClickHouseToRedis, CACHE_KEY };
