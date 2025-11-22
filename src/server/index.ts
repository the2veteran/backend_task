// src/server/index.ts
import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import dotenv from 'dotenv';
import ordersRoute from './orders';
import { pool } from '../DB';
import { redis } from '../services/redis';

dotenv.config();
const fastify = Fastify({ logger: true });
fastify.register(websocketPlugin);

// register routes
fastify.register(ordersRoute);

fastify.get('/health', async () => ({ status: 'ok' }));

const start = async () => {
    try {
        const port = Number(process.env.PORT) || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log('Server listening', port);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
start();
