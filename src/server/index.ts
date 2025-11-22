// src/server/index.ts
import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'path';
import dotenv from 'dotenv';
import ordersRoute from './orders';
import { ensureRedis } from '../services/redis';

dotenv.config();

const fastify = Fastify({ logger: true });

fastify.register(websocketPlugin);

// Serve the HTML UI
fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), 'public'),
});

fastify.register(ordersRoute);

fastify.get('/health', async () => ({ status: 'ok' }));

const start = async () => {
    try {
        await ensureRedis();
        const port = Number(process.env.PORT) || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        fastify.log.info(`server running on ${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
