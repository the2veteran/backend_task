

const axios = require('axios');
const WebSocket = require('ws');

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const WS_URL   = process.argv[3] || 'ws://localhost:3000';

async function createOrder(tokenIn, tokenOut, amountIn) {
  const { data } = await axios.post(`${BASE_URL}/api/orders/execute`, {
    tokenIn, tokenOut, amountIn
  }, { headers: { 'Content-Type': 'application/json' } });
  return data.orderId;
}

function subscribe(orderId) {
  const ws = new WebSocket(`${WS_URL}/ws/${orderId}`);
  console.log(`[WS OPEN] ${orderId}`);
  ws.on('message', (msg) => {
    try {
      const e = JSON.parse(msg.toString());
      console.log(`[${orderId}] ${e.status}`, e.details || '');
    } catch (_) {}
  });
  ws.on('close', () => console.log(`[WS CLOSE] ${orderId}`));
  ws.on('error', (err) => console.error(`[WS ERR] ${orderId}`, err.message));
}

(async () => {
  const orders = await Promise.all([
    createOrder('SOL','USDC',5),
    createOrder('SOL','USDC',3),
    createOrder('SOL','USDT',2),
    createOrder('USDC','SOL',10),
    createOrder('USDT','SOL',7),
  ]);
  console.log('Created orders:', orders.join(', '));
  orders.forEach(subscribe);
})().catch(e => {
  console.error('Sim error:', e.message);
  process.exit(1);
});
