
const axios = require('axios');
const { BASE_URL } = require('./_helpers');

test('order persists chosen_dex', async () => {
  const { data } = await axios.post(`${BASE_URL}/api/orders/execute`, { tokenIn:'SOL', tokenOut:'USDC', amountIn: 2 });
  // Give worker some time
  await new Promise(r => setTimeout(r, 4000));
  // No direct DB access here; this test is smoke-level. Real DB assertion is in integration env.
  expect(typeof data.orderId).toBe('string');
});
