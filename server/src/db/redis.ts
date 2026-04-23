import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis | null {
    if (redisInstance) {
        return redisInstance;
    }

    if (!process.env.REDIS_URL) {
        return null;
    }

    try {
        redisInstance = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                if (times > 3) {
                    return null; // Stop retrying
                }
                return Math.min(times * 100, 3000);
            }
        });

        redisInstance.on('error', (err) => {
            logger.error('[Redis] Connection error', { error: err.message });
        });

        redisInstance.on('connect', () => {
            logger.info('[Redis] Connected successfully');
        });

        return redisInstance;
    } catch (err) {
        logger.error('[Redis] Failed to initialize', { error: String(err) });
        return null;
    }
}
