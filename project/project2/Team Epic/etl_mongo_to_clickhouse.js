// etl_mongo_to_clickhouse.js
// Clean ETL: Mongo (enriched daily docs) -> ClickHouse (daily_weather table)

const { MongoClient } = require('mongodb');
const { ClickHouse } = require('clickhouse');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const MONGO_DB = process.env.MONGO_DB || 'stockton_weather';
const DAILY_COL = process.env.MONGO_COLLECTION_DAILY || 'stockton_daily_enriched';

const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL || 'http://localhost';
const CLICKHOUSE_PORT = Number(process.env.CLICKHOUSE_PORT || 8123);
const CLICKHOUSE_DB = process.env.CLICKHOUSE_DB || 'stockton_weather';
const CLICKHOUSE_USER = process.env.CLICKHOUSE_USER || 'default';
const CLICKHOUSE_PASSWORD = process.env.CLICKHOUSE_PASSWORD || '';

const TABLE = process.env.CLICKHOUSE_TABLE || 'daily_weather';

const clickhouse = new ClickHouse({
    url: CLICKHOUSE_URL,
    port: CLICKHOUSE_PORT,
    basicAuth: {
        username: CLICKHOUSE_USER,
        password: CLICKHOUSE_PASSWORD,
    },
    format: 'json',
    config: { database: CLICKHOUSE_DB },
});

async function resetTable() {
    await clickhouse.query(`DROP TABLE IF EXISTS ${TABLE}`).toPromise();

    const ddl = `
        CREATE TABLE ${TABLE} (
                                  date Date,
                                  max_temp_c Float32,
                                  min_temp_c Float32,
                                  precip_mm Float32
        )
            ENGINE = MergeTree()
    ORDER BY date
    `;
    await clickhouse.query(ddl).toPromise();
    console.log(`Recreated ClickHouse table ${CLICKHOUSE_DB}.${TABLE}`);
}

async function main() {
    await resetTable();

    const mongo = new MongoClient(MONGO_URI);
    await mongo.connect();
    const db = mongo.db(MONGO_DB);
    const coll = db.collection(DAILY_COL);

    const docs = await coll.find({}).sort({ date: 1 }).toArray();
    if (!docs.length) {
        console.log('No enriched docs found in Mongo. Run npm run etl-api-mongo first.');
        await mongo.close();
        return;
    }

    // Build VALUES list: ('YYYY-MM-DD', max, min, precip), ...
    const valuesSql = docs
        .map((d) => {
            // Normalize date to 'YYYY-MM-DD'
            let dateStr;
            if (d.date instanceof Date) {
                dateStr = d.date.toISOString().slice(0, 10); // 'YYYY-MM-DD'
            } else {
                dateStr = String(d.date).slice(0, 10).trim();
            }

            const max = Number(d.max_temp_c ?? d.max_tempC ?? 0);
            const min = Number(d.min_temp_c ?? d.min_tempC ?? 0);
            const precip = Number(d.precip_mm ?? d.precipitation_mm ?? 0);

            // ClickHouse Date accepts 'YYYY-MM-DD' in single quotes
            return `('${dateStr}',${max},${min},${precip})`;
        })
        .join(',');

    const insertQuery = `
    INSERT INTO ${TABLE} (date, max_temp_c, min_temp_c, precip_mm)
    VALUES ${valuesSql}
  `;

    await clickhouse.query(insertQuery).toPromise();

    console.log(`Inserted ${docs.length} rows into ClickHouse table ${TABLE}`);
    await mongo.close();
}

main().catch((err) => {
    console.error('Error in etl_mongo_to_clickhouse:', err);
    process.exit(1);
});
