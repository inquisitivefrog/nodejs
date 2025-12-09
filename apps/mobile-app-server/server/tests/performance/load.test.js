const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestDB, clearDatabase, createTestAdmin } = require('../helpers/testHelpers');
const app = require('../../src/app');

describe('Load Testing', () => {
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    await setupTestDB();
    await clearDatabase();

    // Create admin user
    adminUser = await createTestAdmin({
      email: 'load-admin@test.com',
      password: 'admin123',
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminUser.email,
        password: 'admin123',
      });

    adminToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await clearDatabase();
  });

  describe('Sustained Load', () => {
    it('should handle 50 sequential requests without degradation', async () => {
      const responseTimes = [];
      const errors = [];

      for (let i = 0; i < 50; i++) {
        const start = Date.now();
        try {
          const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${adminToken}`);
          
          const duration = Date.now() - start;
          responseTimes.push(duration);

          if (response.status !== 200) {
            errors.push({ iteration: i, status: response.status });
          }
        } catch (error) {
          errors.push({ iteration: i, error: error.message });
        }
      }

      // Calculate statistics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      // No errors should occur
      expect(errors.length).toBe(0);

      // Average response time should be reasonable
      expect(avgResponseTime).toBeLessThan(300);

      // Max response time should not be excessive
      expect(maxResponseTime).toBeLessThan(1000);

      console.log(`Load Test Results: avg=${avgResponseTime.toFixed(2)}ms, min=${minResponseTime}ms, max=${maxResponseTime}ms`);
    });

    it('should handle burst of 20 concurrent requests', async () => {
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      // All requests should succeed
      const failures = responses.filter(r => r.status !== 200);
      expect(failures.length).toBe(0);

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);

      console.log(`Burst Test: 20 concurrent requests completed in ${duration}ms`);
    });
  });

  describe('Mixed Workload', () => {
    it('should handle mixed read and write operations', async () => {
      const User = require('../../src/models/User');
      const operations = [];

      // Mix of read and write operations
      for (let i = 0; i < 10; i++) {
        // Read operation
        operations.push(
          request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
        );

        // Write operation (create user)
        if (i % 2 === 0) {
          operations.push(
            request(app)
              .post('/api/auth/register')
              .send({
                email: `load-user-${i}-${Date.now()}@test.com`,
                password: 'password123',
                name: `Load User ${i}`,
              })
          );
        }
      }

      const start = Date.now();
      const responses = await Promise.all(operations);
      const duration = Date.now() - start;

      // Most operations should succeed (some might fail due to duplicate emails)
      const successes = responses.filter(r => r.status >= 200 && r.status < 300);
      expect(successes.length).toBeGreaterThan(operations.length * 0.8); // At least 80% success rate

      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000);

      console.log(`Mixed Workload: ${operations.length} operations completed in ${duration}ms (${successes.length} successful)`);
    });
  });
});


