import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const TEAM_NAME = process.env.TEAM_NAME || 'UnknownTeam';

export const redisClient = createClient({
  url: REDIS_URL,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

export { TEAM_NAME };
export default redisClient;

