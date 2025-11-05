import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

let redis;
export async function connectRedis() {
  if (redis) return redis;
  redis = createClient({ url: process.env.REDIS_URL });
  redis.on("error", (e) => console.error("Redis error:", e));
  await redis.connect();
  return redis;
}

export function keyReading(sensorId) {
  return `reading:${sensorId}`;
}
