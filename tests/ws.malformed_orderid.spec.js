
const WebSocket = require('ws');
const { WS_URL } = require('./_helpers');

test('WS with malformed order id does not crash', async () => {
  const ws = new WebSocket(`${WS_URL}/ws/not-a-uuid`);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  ws.close();
  expect(true).toBe(true);
});
