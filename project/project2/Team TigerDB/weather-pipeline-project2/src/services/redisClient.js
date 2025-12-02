const { createClient } = require("redis");
const { redisUrl } = require("../config");

const redis = createClient({ url: redisUrl });

async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

module.exports = { redis, connectRedis };
