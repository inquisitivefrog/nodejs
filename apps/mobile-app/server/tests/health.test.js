const request = require('supertest');
const app = require('../src/app');

describe('Health Check API', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('message', 'Server is running');
  });
});

