const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestDB, clearDatabase, createTestUser, createTestAdmin } = require('../helpers/testHelpers');
const app = require('../../src/app');
const User = require('../../src/models/User');

describe('API Versioning', () => {
  let adminToken;
  let regularUserToken;

  beforeAll(async () => {
    await setupTestDB();
    
    // Create admin user
    const adminUser = new User({
      email: 'admin@test.com',
      password: 'password123',
      name: 'Admin User',
      role: 'admin',
      emailVerified: true,
    });
    await adminUser.save();

    // Login as admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    adminToken = adminLogin.body.accessToken;

    // Create regular user
    const regularUser = new User({
      email: 'user@test.com',
      password: 'password123',
      name: 'Regular User',
      role: 'user',
      emailVerified: true,
    });
    await regularUser.save();

    // Login as regular user
    const userLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@test.com', password: 'password123' });
    regularUserToken = userLogin.body.accessToken;
  });

  afterAll(async () => {
    await clearDatabase();
  });

  describe('V1 API Routes', () => {
    it('should access auth routes via /api/v1/auth', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should access user routes via /api/v1/users', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should access admin routes via /api/v1/admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/pools')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pools');
    });
  });

  describe('Legacy API Routes (Backward Compatibility)', () => {
    it('should still support /api/auth routes', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
    });

    it('should still support /api/users routes', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
    });

    it('should still support /api/admin routes', async () => {
      const response = await request(app)
        .get('/api/admin/pools')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });
});

