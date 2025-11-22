
const { createOrder, waitForStatuses } = require('./_helpers');
test('receives full lifecycle over WS', async () => {
  const id = await createOrder({ tokenIn:'SOL', tokenOut:'USDC', amountIn: 2 });
  const seq = await waitForStatuses(id, ['pending','routing','building','submitted','confirmed']);
  expect(seq[0]).toBe('pending');
});
