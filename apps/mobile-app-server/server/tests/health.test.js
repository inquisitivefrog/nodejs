const request = require('supertest');
const { setupTestDB } = require('./helpers/testHelpers');

// Import app AFTER setting up test environment
const app = require('../src/app');

// Setup database before tests
beforeAll(async () => {
  await setupTestDB();
});

describe('Health Check API', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('message', 'Server is running');
  });
});

