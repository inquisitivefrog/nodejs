const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestDB, clearDatabase, createTestUser, createTestAdmin } = require('../helpers/testHelpers');
const app = require('../../src/app');

describe('API Performance Tests', () => {
  let adminToken;
  let adminUser;
  let testUsers = [];

  beforeAll(async () => {
    await setupTestDB();
    await clearDatabase();

    // Create admin user for authenticated requests
    adminUser = await createTestAdmin({
      email: 'perf-admin@test.com',
      password: 'admin123',
    });

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: adminUser.email,
        password: 'admin123',
      });

    adminToken = loginResponse.body.accessToken;

    // Create test users for performance testing
    for (let i = 0; i < 10; i++) {
      const user = await createTestUser({
        email: `perf-user-${i}@test.com`,
        name: `Performance User ${i}`,
      });
      testUsers.push(user);
    }
  });

  afterAll(async () => {
    await clearDatabase();
  });

  describe('Response Time Benchmarks', () => {
    it('health check should respond within 50ms', async () => {
      const start = Date.now();
      const response = await request(app).get('/health');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(50);
    });

    it('GET /api/v1/auth/me should respond within 200ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(200);
    });

    it('GET /api/users should respond within 500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });

    it('GET /api/v1/users/:id should respond within 300ms', async () => {
      const userId = testUsers[0]._id;
      const start = Date.now();
      const response = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(300);
    });

    it('POST /api/v1/auth/login should respond within 300ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: adminUser.email,
          password: 'admin123',
        });
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(300);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 10 concurrent health check requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/health')
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (less than 1 second for 10 requests)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle 50 concurrent health check requests (load balancer scenario)', async () => {
      const requests = Array(50).fill(null).map(() =>
        request(app).get('/health')
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      // All requests should succeed
      const failures = responses.filter(r => r.status !== 200);
      expect(failures.length).toBe(0);

      // Should complete within reasonable time even with 50 concurrent requests
      // Load balancer distributes load across multiple instances
      expect(duration).toBeLessThan(3000);

      console.log(`Load Balancer Test: 50 concurrent requests completed in ${duration}ms`);
    });

    it('should handle 5 concurrent authenticated requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(2000);
    });

    it('should handle 10 concurrent user list requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.users).toBeInstanceOf(Array);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);
    });

    it('should handle 30 concurrent authenticated requests (load balancer scenario)', async () => {
      const requests = Array(30).fill(null).map(() =>
        request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      // All requests should succeed
      const failures = responses.filter(r => r.status !== 200);
      expect(failures.length).toBe(0);

      // Should complete within reasonable time with load balancing
      expect(duration).toBeLessThan(5000);

      console.log(`Load Balancer Auth Test: 30 concurrent requests completed in ${duration}ms`);
    });
  });

  describe('Database Query Performance', () => {
    it('should query all users efficiently', async () => {
      const User = require('../../src/models/User');
      
      const start = Date.now();
      const users = await User.find().select('-password').limit(100);
      const duration = Date.now() - start;

      expect(users.length).toBeGreaterThan(0);
      // Database query should be fast even with multiple users
      expect(duration).toBeLessThan(200);
    });

    it('should query user by ID efficiently', async () => {
      const User = require('../../src/models/User');
      const userId = testUsers[0]._id;
      
      const start = Date.now();
      const user = await User.findById(userId).select('-password');
      const duration = Date.now() - start;

      expect(user).toBeDefined();
      // Indexed ID lookup should be very fast
      expect(duration).toBeLessThan(50);
    });

    it('should query user by email efficiently', async () => {
      const User = require('../../src/models/User');
      const email = testUsers[0].email;
      
      const start = Date.now();
      const user = await User.findOne({ email }).select('-password');
      const duration = Date.now() - start;

      expect(user).toBeDefined();
      // Email is indexed, should be fast
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Authentication Performance', () => {
    it('should handle multiple login requests efficiently', async () => {
      const loginRequests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({
            email: adminUser.email,
            password: 'admin123',
          })
      );

      const start = Date.now();
      const responses = await Promise.all(loginRequests);
      const duration = Date.now() - start;

      // All logins should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.accessToken).toBeDefined();
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(2000);
    });
  });
});


