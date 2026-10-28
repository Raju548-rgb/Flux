import { Redis } from 'ioredis';
import dotenv from 'dotenv';
import logger from './utils/logger.js';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL);

redis.on('connect', () => {
  logger.info('✅ Connected to Redis');
});

redis.on('error', (err: any) => {
  logger.error(`❌ Redis Connection Error: ${err.message || err}`);
});

export default redis;
