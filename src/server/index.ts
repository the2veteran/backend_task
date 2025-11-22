// src/server/index.ts
import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import dotenv from 'dotenv';
import ordersRoute from './orders';
import { ensureRedis } from '../services/redis';

dotenv.config();

const fastify = Fastify({ logger: true });

fastify.register(websocketPlugin, {
    options: { maxPayload: 1048576 },
});

fastify.register(ordersRoute);

fastify.get('/health', async () => ({ status: 'ok' }));

const start = async () => {
    try {
        await ensureRedis();
        const port = Number(process.env.PORT) || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        fastify.log.info(`server listening on ${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
