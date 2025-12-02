const { etlApiToMongo } = require("./etl/etl_api_to_mongo");
const { etlMongoToClickHouse } = require("./etl/etl_mongo_to_clickhouse");
const { etlClickHouseToRedis } = require("./etl/etl_clickhouse_to_redis");
const { getMongoDb } = require("./services/mongoClient");
const { ensureSchema } = require("./services/clickhouseClient");
const { connectRedis } = require("./services/redisClient");

(async () => {
  try {
    await getMongoDb();
    await ensureSchema();
    await connectRedis();

    console.log("Running API → Mongo...");
    await etlApiToMongo();
    console.log("Running Mongo → ClickHouse...");
    await etlMongoToClickHouse();
    console.log("Running ClickHouse → Redis...");
    await etlClickHouseToRedis();

    console.log("ETL pipeline finished successfully.");
  } catch (err) {
    console.error("ETL pipeline failed:", err);
  } finally {
    process.exit(0);
  }
})();
