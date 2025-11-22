// src/services/redis.ts
import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

export const redis = new IORedis(process.env.BULLMQ_REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
