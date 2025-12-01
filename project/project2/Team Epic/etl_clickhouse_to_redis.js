// etl_clickhouse_to_redis.js
const { ClickHouse } = require('clickhouse');
const Redis = require('ioredis');
require('dotenv').config();

const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL || 'http://localhost';
const CLICKHOUSE_PORT = Number(process.env.CLICKHOUSE_PORT || 8123);
const CLICKHOUSE_DB = process.env.CLICKHOUSE_DB || 'stockton_weather';
const CLICKHOUSE_USER = process.env.CLICKHOUSE_USER || 'default';
const CLICKHOUSE_PASSWORD = process.env.CLICKHOUSE_PASSWORD || '';
const TABLE = process.env.CLICKHOUSE_TABLE || 'daily_weather';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_KEY = process.env.REDIS_KEY || 'stockton:daily_weather';
const REDIS_TTL_SECONDS = Number(process.env.REDIS_TTL_SECONDS || 600);

const clickhouse = new ClickHouse({
    url: CLICKHOUSE_URL,
    port: CLICKHOUSE_PORT,
    basicAuth: {
        username: CLICKHOUSE_USER,
        password: CLICKHOUSE_PASSWORD
    },
    format: 'json',
    config: { database: CLICKHOUSE_DB }
});

const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD
});

async function main() {
    const query = `SELECT date, max_temp_c, min_temp_c, precip_mm
                 FROM ${TABLE}
                 ORDER BY date`;

    const result = await clickhouse.query(query).toPromise();
    const rows = result.data || result;

    console.log(`ClickHouse returned ${rows.length} rows`);

    await redis.set(REDIS_KEY, JSON.stringify(rows), 'EX', REDIS_TTL_SECONDS);
    console.log(
        `Cached ${rows.length} rows in Redis key=${REDIS_KEY} TTL=${REDIS_TTL_SECONDS}s`
    );

    await redis.quit();
}

main().catch(err => {
    console.error('Error in etl_clickhouse_to_redis:', err);
    process.exit(1);
});
