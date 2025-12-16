const request = require('supertest');
const { setupTestDB, clearDatabase, createTestUser, createTestAdmin } = require('../helpers/testHelpers');
const app = require('../../src/app');
const User = require('../../src/models/User');

describe('Search Functionality', () => {
  let adminToken;
  let adminUser;
  let testUsers = [];

  beforeAll(async () => {
    await setupTestDB();
    await clearDatabase();

    adminUser = await createTestAdmin({
      email: 'admin-search@test.com',
      password: 'admin123',
    });

    const adminLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: adminUser.email,
        password: 'admin123',
      });
    adminToken = adminLoginResponse.body.accessToken;

    // Create test users with various names and emails
    testUsers.push(
      await createTestUser({
        email: 'john.doe@example.com',
        name: 'John Doe',
        role: 'user',
      })
    );
    testUsers.push(
      await createTestUser({
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        role: 'admin',
      })
    );
    testUsers.push(
      await createTestUser({
        email: 'bob.johnson@example.com',
        name: 'Bob Johnson',
        role: 'user',
        isActive: false,
      })
    );
    testUsers.push(
      await createTestUser({
        email: 'alice.williams@example.com',
        name: 'Alice Williams',
        role: 'user',
      })
    );
  });

  afterAll(async () => {
    await clearDatabase();
  });

  describe('GET /api/v1/search/users', () => {
    it('should search users by name', async () => {
      const response = await request(app)
        .get('/api/v1/search/users?q=John')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users.length).toBeGreaterThan(0);
      expect(response.body.users.some((u) => u.name.includes('John'))).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('query');
    });

    it('should search users by email', async () => {
      const response = await request(app)
        .get('/api/v1/search/users?q=jane.smith')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users.length).toBeGreaterThan(0);
      expect(response.body.users.some((u) => u.email.includes('jane.smith'))).toBe(true);
    });

    it('should be case-insensitive', async () => {
      const response = await request(app)
        .get('/api/v1/search/users?q=JOHN')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users.length).toBeGreaterThan(0);
      expect(response.body.users.some((u) => u.name.toLowerCase().includes('john'))).toBe(true);
    });

    it('should filter by role', async () => {
      const response = await request(app)
        .get('/api/v1/search/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users.every((u) => u.role === 'admin')).toBe(true);
      expect(response.body.query.role).toBe('admin');
    });

    it('should filter by isActive status', async () => {
      const response = await request(app)
        .get('/api/v1/search/users?isActive=false')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users.every((u) => u.isActive === false)).toBe(true);
      expect(response.body.query.isActive).toBe(false);
    });

    it('should combine search query with filters', async () => {
      const response = await request(app)
        .get('/api/v1/search/users?q=John&role=user')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users.every((u) => u.role === 'user')).toBe(true);
      expect(response.body.users.some((u) => u.name.includes('John') || u.email.includes('John'))).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/search/users?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination).toHaveProperty('hasNextPage');
      expect(response.body.pagination).toHaveProperty('hasPrevPage');
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/v1/search/users?sort=name&order=asc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const names = response.body.users.map((u) => u.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should enforce maximum limit of 100', async () => {
      const response = await request(app)
        .get('/api/v1/search/users?limit=150')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users.length).toBeLessThanOrEqual(100);
      expect(response.body.pagination.limit).toBe(100);
    });

    it('should return empty results for non-matching query', async () => {
      const response = await request(app)
        .get('/api/v1/search/users?q=NonExistentUser12345')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should require admin authentication', async () => {
      // Create regular user
      const regularUser = await createTestUser({
        email: 'regular@test.com',
        password: 'password123',
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: regularUser.email,
          password: 'password123',
        });
      const regularToken = loginResponse.body.accessToken;

      await request(app)
        .get('/api/v1/search/users?q=test')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v1/search/users?q=test').expect(401);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/search/users?role=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/search/users?page=abc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should validate sort field', async () => {
      const response = await request(app)
        .get('/api/v1/search/users?sort=invalidField')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });
  });
});



