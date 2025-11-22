
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { orderQueue } from '../services/queue';
import { pool } from '../DB';
import { redis } from '../services/redis';

export default async function routes(fastify: FastifyInstance) {
    // Create order
    fastify.post('/api/orders/execute', async (req, reply) => {
        const body = req.body as any;
        const tokenIn = body?.tokenIn;
        const tokenOut = body?.tokenOut;
        const amountIn = Number(body?.amountIn);

        if (!tokenIn || !tokenOut || !amountIn || amountIn <= 0) {
            return reply.status(400).send({ error: 'Invalid order body' });
        }

        const orderId = uuidv4();

        // persist order as pending
        await pool.query(
            `INSERT INTO orders(id, status, order_type, token_in, token_out, amount_in, metadata) VALUES($1,$2,$3,$4,$5,$6,$7)`,
            [orderId, 'pending', 'market', tokenIn, tokenOut, amountIn, {}]
        );

        // persist initial event
        await pool.query(`INSERT INTO order_events(order_id, status, details) VALUES($1,$2,$3)`, [orderId, 'pending', { message: 'Order received' }]);

        // add to queue (3 attempts, exponential backoff handled in worker options if needed)
        await orderQueue.add('execute', { orderId, tokenIn, tokenOut, amountIn }, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });

        // Reply immediately with orderId (client should open WS to /ws/:orderId)
        return reply.send({ orderId });
    });

    // WebSocket subscription per orderId: forward redis pub/sub -> client
    fastify.get('/ws/:orderId', { websocket: true }, (connection, req) => {
        const { orderId } = (req.params as any) || {};
        const sub = redis.duplicate();

        const forward = (msgStr: string) => {
            try {
                const parsed = JSON.parse(msgStr);
                if (parsed.orderId === orderId) {
                    connection.socket.send(JSON.stringify(parsed));
                }
            } catch (e) {
                // ignore
            }
        };

        sub.subscribe('order_updates', (err) => {
            if (err) {
                console.error('subscribe err', err);
            }
        });

        sub.on('message', (_channel, message) => forward(message));
        connection.socket.on('close', () => {
            sub.quit().catch(() => {});
        });
    });
}
