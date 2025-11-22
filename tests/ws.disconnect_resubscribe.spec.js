
const WebSocket = require('ws');
const { createOrder, BASE_URL, WS_URL } = require('./_helpers');
const axios = require('axios');

test('can disconnect and re-subscribe mid-flight', async () => {
  const id = await createOrder({ tokenIn:'SOL', tokenOut:'USDC', amountIn: 3 });
  // First connection
  let firstGot = false;
  const ws1 = new WebSocket(`${WS_URL}/ws/${id}`);
  await new Promise(res => ws1.once('message', () => { firstGot = true; ws1.close(); res(); }));
  expect(firstGot).toBe(true);
  // Re-subscribe
  const ws2 = new WebSocket(`${WS_URL}/ws/${id}`);
  await new Promise((resolve, reject) => {
    let got = false;
    ws2.on('message', () => { got = true; ws2.close(); resolve(); });
    setTimeout(() => reject(new Error('no message after resubscribe')), 8000);
  });
});
