const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestDB, clearDatabase, createTestUser, createTestAdmin } = require('../helpers/testHelpers');
const app = require('../../src/app');
const User = require('../../src/models/User');

describe('Pagination and Filtering', () => {
  let adminToken;

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

    // Create multiple test users
    const users = [];
    for (let i = 0; i < 25; i++) {
      users.push({
        email: `user${i}@test.com`,
        password: 'password123',
        name: `User ${i}`,
        role: i % 2 === 0 ? 'user' : 'admin',
        isActive: i < 20, // First 20 are active
        emailVerified: true,
      });
    }
    await User.insertMany(users);
  });

  afterAll(async () => {
    await clearDatabase();
  });

  describe('Pagination', () => {
    it('should return paginated results with default page and limit', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination).toHaveProperty('hasNextPage');
      expect(response.body.pagination).toHaveProperty('hasPrevPage');
      expect(response.body.users).toHaveLength(10);
    });

    it('should return correct page when page parameter is provided', async () => {
      const response = await request(app)
        .get('/api/v1/users?page=2&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.hasNextPage).toBe(true);
      expect(response.body.pagination.hasPrevPage).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/users?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.users).toHaveLength(5);
    });

    it('should enforce maximum limit of 100', async () => {
      const response = await request(app)
        .get('/api/v1/users?limit=200')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBeLessThanOrEqual(100);
    });

    it('should handle invalid page numbers', async () => {
      const response = await request(app)
        .get('/api/v1/users?page=0')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1); // Should default to 1
    });
  });

  describe('Sorting', () => {
    it('should sort by createdAt descending by default', async () => {
      const response = await request(app)
        .get('/api/v1/users?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      const users = response.body.users;
      if (users.length > 1) {
        const dates = users.map(u => new Date(u.createdAt));
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i].getTime()).toBeGreaterThanOrEqual(dates[i + 1].getTime());
        }
      }
    });

    it('should sort by name ascending when specified', async () => {
      const response = await request(app)
        .get('/api/v1/users?sort=name&order=asc&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      const users = response.body.users;
      if (users.length > 1) {
        for (let i = 0; i < users.length - 1; i++) {
          expect(users[i].name.localeCompare(users[i + 1].name)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('should sort by email descending when specified', async () => {
      const response = await request(app)
        .get('/api/v1/users?sort=email&order=desc&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      const users = response.body.users;
      if (users.length > 1) {
        for (let i = 0; i < users.length - 1; i++) {
          expect(users[i].email.localeCompare(users[i + 1].email)).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('Filtering', () => {
    it('should filter by role', async () => {
      const response = await request(app)
        .get('/api/v1/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      response.body.users.forEach(user => {
        expect(user.role).toBe('admin');
      });
    });

    it('should filter by isActive status', async () => {
      const response = await request(app)
        .get('/api/v1/users?isActive=true')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      response.body.users.forEach(user => {
        expect(user.isActive).toBe(true);
      });
    });

    it('should filter by email (partial match)', async () => {
      const response = await request(app)
        .get('/api/v1/users?email=user1')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      response.body.users.forEach(user => {
        expect(user.email).toContain('user1');
      });
    });

    it('should filter by name (partial match)', async () => {
      const response = await request(app)
        .get('/api/v1/users?name=User 1')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      response.body.users.forEach(user => {
        expect(user.name).toMatch(/User 1/i);
      });
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/v1/users?role=user&isActive=true')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      response.body.users.forEach(user => {
        expect(user.role).toBe('user');
        expect(user.isActive).toBe(true);
      });
    });
  });

  describe('Combined Pagination, Sorting, and Filtering', () => {
    it('should work with pagination, sorting, and filtering together', async () => {
      const response = await request(app)
        .get('/api/v1/users?role=user&isActive=true&sort=name&order=asc&page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.users.length).toBeLessThanOrEqual(5);
      
      response.body.users.forEach(user => {
        expect(user.role).toBe('user');
        expect(user.isActive).toBe(true);
      });
    });
  });
});

