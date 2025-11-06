import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();
const r = createClient({ url: process.env.REDIS_URL });
r.on("error", (e)=>console.error("Redis error", e.message));
export async function initRedis(){ if(!r.isOpen) await r.connect(); return r; }
export function redis(){ return r; }
