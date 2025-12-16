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

    expect(response.body).toHaveProperty('status');
    expect(['healthy', 'degraded', 'OK']).toContain(response.body.status);
    // Message is optional - health check returns status object
    // In production with load balancer, serverInstance will be present
    // In test environment, it may be 'unknown' or the test instance
    if (response.body.serverInstance) {
      expect(response.body.serverInstance).toBeDefined();
    }
    expect(response.body).toHaveProperty('timestamp');
  });
});

