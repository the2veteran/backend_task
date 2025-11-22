
const axios = require('axios');
const { BASE_URL } = require('./_helpers');

test('health endpoint works', async () => {
  const { data } = await axios.get(`${BASE_URL}/health`);
  expect(data.status).toBe('ok');
});
