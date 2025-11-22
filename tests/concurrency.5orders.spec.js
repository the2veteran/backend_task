
const { createOrder, waitForStatuses } = require('./_helpers');

test('handles 5 simultaneous orders', async () => {
  const bodies = [
    { tokenIn:'SOL', tokenOut:'USDC', amountIn:5 },
    { tokenIn:'SOL', tokenOut:'USDC', amountIn:3 },
    { tokenIn:'SOL', tokenOut:'USDT', amountIn:2 },
    { tokenIn:'USDC', tokenOut:'SOL', amountIn:6 },
    { tokenIn:'USDT', tokenOut:'SOL', amountIn:7 },
  ];
  const ids = await Promise.all(bodies.map(b => createOrder(b)));
  const statuses = await Promise.all(ids.map(id => waitForStatuses(id, ['pending','routing','building','submitted','confirmed'], 20000)));
  expect(statuses.length).toBe(5);
});
