
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { orderQueue } from '../services/queue';
import { query } from '../db';
import { redis } from '../services/redis';

export default async function ordersRoute(fastify: FastifyInstance) {

    fastify.post('/api/orders/execute', async (req, reply) => {
        const body = req.body as any;

        const tokenIn = body?.tokenIn;
        const tokenOut = body?.tokenOut;
        const amountIn = Number(body?.amountIn);

        if (!tokenIn || !tokenOut || !amountIn || amountIn <= 0) {
            return reply.status(400).send({ error: 'Invalid order body' });
        }

        const orderId = uuidv4();

        await query(
            `INSERT INTO orders (id, status, order_type, token_in, token_out, amount_in, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [orderId, 'pending', 'market', tokenIn, tokenOut, amountIn, {}]
        );

        await query(
            `INSERT INTO order_events(order_id, status, details)
       VALUES ($1,$2,$3)`,
            [orderId, 'pending', { message: 'Order received' }]
        );

        await orderQueue.add(
            'execute',
            { orderId, tokenIn, tokenOut, amountIn },
            {
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnComplete: true,
                removeOnFail: false,
            }
        );

        return reply.send({ orderId });
    });


    fastify.get(
        '/api/orders/execute',
        { websocket: true },
        (ws, req) => {
            const { orderId } = (req.query as any) || {};

            if (!orderId) {
                ws.close(1008, "orderId query param required");
                return;
            }

            const sub = redis.duplicate();
            const channel = `order:status:${orderId}`;

            sub.subscribe(channel).catch(err => {
                console.error("Redis subscribe error:", err);
            });

            sub.on("message", (_channel, message) => {
                try {
                    ws.send(message);
                } catch {}
            });

            ws.on("close", () => {
                sub.unsubscribe(channel).finally(() => sub.quit());
            });
        }
    );
}
