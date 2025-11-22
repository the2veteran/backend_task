
const { createOrder } = require('./_helpers');
test('creates order and returns orderId', async () => {
  const id = await createOrder({ tokenIn:'SOL', tokenOut:'USDC', amountIn: 5 });
  expect(typeof id).toBe('string');
  expect(id.length).toBeGreaterThan(10);
});
