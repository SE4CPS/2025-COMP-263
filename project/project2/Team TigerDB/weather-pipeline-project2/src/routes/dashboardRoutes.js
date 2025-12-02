const express = require("express");
const router = express.Router();

const { redis } = require("../services/redisClient");
const { client } = require("../services/clickhouseClient");
const { CACHE_KEY } = require("../etl/etl_clickhouse_to_redis");
const { syncIntervalMin } = require("../config");

router.get("/weather-summary", async (req, res) => {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      data.sync_indicator = "full";
      return res.json(data);
    }

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

    return res.json({
      generated_at_utc: new Date().toISOString(),
      refresh_interval_sec: syncIntervalMin * 60,
      sync_indicator: "partial",
      monthly_stats: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

module.exports = router;
