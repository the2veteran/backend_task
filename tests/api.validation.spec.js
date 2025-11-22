
const axios = require('axios');
const { BASE_URL } = require('./_helpers');

test('rejects invalid body', async () => {
  const bad = { tokenIn: 'SOL', tokenOut: null, amountIn: -1 };
  let status = 0;
  try {
    await axios.post(`${BASE_URL}/api/orders/execute`, bad);
  } catch (e) {
    status = e.response?.status || 0;
  }
  expect(status).toBe(400);
});
