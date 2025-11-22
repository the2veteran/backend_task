// src/server/index.ts
import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import dotenv from 'dotenv';
import ordersRoute from './orders';
import { ensureRedis } from '../services/redis';

dotenv.config();

const fastify = Fastify({
    logger: true,
});

fastify.register(websocketPlugin, {
    options: {
        maxPayload: 1048576,
    },
});

// Register all routes
fastify.register(ordersRoute);

// Health check
fastify.get('/health', async () => ({ status: 'ok' }));

// Startup
const start = async () => {
    try {
        await ensureRedis();

        const port = Number(process.env.PORT) || 3000;

        await fastify.listen({
            port,
            host: '0.0.0.0',
        });

        fastify.log.info(`🚀 Server running on port ${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
