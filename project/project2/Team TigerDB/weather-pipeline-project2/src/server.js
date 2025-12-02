const express = require("express");
const path = require("path");
const cors = require("cors");

const { port } = require("./config");
const { connectRedis } = require("./services/redisClient");
const { getMongoDb } = require("./services/mongoClient");
const { ensureSchema } = require("./services/clickhouseClient");

const { etlApiToMongo } = require("./etl/etl_api_to_mongo");
const { etlMongoToClickHouse } = require("./etl/etl_mongo_to_clickhouse");
const { etlClickHouseToRedis } = require("./etl/etl_clickhouse_to_redis");

const dashboardRoutes = require("./routes/dashboardRoutes");

async function bootstrap() {
  await getMongoDb();
  await ensureSchema();
  await connectRedis();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "public")));

  app.use("/api", dashboardRoutes);

  app.post("/api/sync-now", async (req, res) => {
    try {
      await etlApiToMongo();
      await etlMongoToClickHouse();
      await etlClickHouseToRedis();
      res.json({ status: "ok" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: "error" });
    }
  });

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
