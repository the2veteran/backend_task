

import IORedis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const redisUrl =
    process.env.REDIS_URL ||
    process.env.BULLMQ_REDIS_URL ||
    `redis://${process.env.REDIS_HOST || "localhost"}:${
        process.env.REDIS_PORT || 6379
    }`;

export const redis = new IORedis(redisUrl);

export async function ensureRedis() {
    if (!redis.status || redis.status === "end") {
        await redis.connect();
    }
}
