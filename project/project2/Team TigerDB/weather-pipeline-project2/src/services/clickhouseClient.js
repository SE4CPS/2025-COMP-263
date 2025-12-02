const { createClient } = require("@clickhouse/client");
const {
  clickhouseUrl,
  clickhouseUser,
  clickhousePassword,
} = require("../config");

const client = createClient({
  host: clickhouseUrl,
  username: clickhouseUser,
  password: clickhousePassword,
});

async function ensureSchema() {
  await client.command({
    query: `
      CREATE TABLE IF NOT EXISTS weather_monthly (
        month Date,
        avg_temp_max_c Float32,
        avg_temp_min_c Float32,
        total_precipitation_mm Float32,
        warehouse_load_time DateTime,
        rows_loaded UInt32,
        sync_interval_min UInt32,
        load_mode String
      ) ENGINE = MergeTree()
      ORDER BY month
    `,
  });
}

module.exports = { client, ensureSchema };
