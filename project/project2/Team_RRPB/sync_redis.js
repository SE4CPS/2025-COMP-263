const { createClient } = require("redis");
const { createClient: createClickHouseClient } = require("@clickhouse/client");
require("dotenv").config();

// --- CONFIGURATION ---
const CLKHOUSE_URL = process.env.CLICKHOUSE_URL || "http://localhost:8123";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"; // Add this to .env if needed
const CACHE_TTL = 3600; // 1 Hour in seconds

// Initialize Clients
const clickhouse = createClickHouseClient({
    url: CLKHOUSE_URL,
});

async function syncCache() {
    const redisClient = createClient({ url: REDIS_URL });

    redisClient.on("error", (err) => console.error("Redis Client Error", err));

    try {
        // 1. Connect to Redis
        await redisClient.connect();
        console.log("Redis connected.");

        // 2. Define the Aggregation Query
        // This groups data by day and calculates the stats needed for the dashboard
        const query = `
      SELECT
        toString(toDate(time)) as report_date,
        round(sum(rain), 2) as total_rain,
        round(max(temperature), 1) as max_temp,
        round(min(temperature), 1) as min_temp,
        round(avg(soil_moisture), 4) as avg_soil,
        round(max(relative_humidity), 1) as peak_humidity
      FROM weather_hourly
      GROUP BY report_date
      ORDER BY report_date DESC
      LIMIT 7
    `;

        console.log("Fetching aggregated data from ClickHouse...");

        // 3. Execute Query using @clickhouse/client
        const resultSet = await clickhouse.query({
            query: query,
            format: "JSONEachRow",
        });

        // Convert the stream to a JSON object
        const rows = await resultSet.json();
        console.log(`Fetched ${rows.length} daily summaries.`);

        // 4. Cache each row into Redis
        for (const row of rows) {
            const dateKey = row.report_date;
            const redisKey = `weather:${dateKey}`;

            // Create the JSON payload
            const weatherData = JSON.stringify({
                total_rain: row.total_rain,
                temp_high: row.max_temp,
                temp_low: row.min_temp,
                soil_moisture: row.avg_soil,
                peak_humidity: row.peak_humidity,
            });

            // Set key with Expiration (TTL)
            await redisClient.set(redisKey, weatherData, {
                EX: CACHE_TTL,
            });

            console.log(`   -> Cached ${redisKey} (TTL: ${CACHE_TTL}s)`);
        }

        console.log("Caching complete.");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await redisClient.disconnect();
        await clickhouse.close();
    }
}

// Run it
syncCache();