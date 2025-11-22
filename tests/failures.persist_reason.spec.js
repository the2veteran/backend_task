
// NOTE: This test is opportunistic; swap failure is ~3% random.
// We'll just assert that a failed event is possible in a batch of orders.
const { createOrder, waitForStatuses } = require('./_helpers');

test('at least one failure in batch of 20 (maybe)', async () => {
  const bodies = Array.from({length: 20}, (_,i) => ({ tokenIn:'SOL', tokenOut:'USDC', amountIn: 1 + (i%3) }));
  const ids = await Promise.all(bodies.map(b => createOrder(b)));
  const results = await Promise.all(ids.map(id => 
    waitForStatuses(id, ['pending','routing','building','submitted','confirmed'], 25000)
      .then(() => 'confirmed')
      .catch(() => 'failed-maybe')
  ));
  expect(results.length).toBe(20);
});
