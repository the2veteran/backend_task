
const { createOrder, waitForStatuses } = require('./_helpers');

test('status order is correct', async () => {
  const id = await createOrder({ tokenIn:'SOL', tokenOut:'USDC', amountIn: 2 });
  const seq = await waitForStatuses(id, ['pending','routing','building','submitted','confirmed']);
  expect(seq.slice(0,5)).toEqual(['pending','routing','building','submitted','confirmed']);
});
