const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  mongoUri: process.env.MONGO_URI,
  mongoDb: process.env.MONGO_DB,
  clickhouseUrl: process.env.CLICKHOUSE_URL,
  clickhouseUser: process.env.CLICKHOUSE_USER,
  clickhousePassword: process.env.CLICKHOUSE_PASSWORD,
  redisUrl: process.env.REDIS_URL,
  port: process.env.PORT,
  cityName: process.env.CITY_NAME,
  syncIntervalMin: Number(process.env.SYNC_INTERVAL_MIN),
};
