const request = require('supertest');
const app = require('../src/app');
const { setupTestDB, clearDatabase, createTestUser, createTestAdmin } = require('./helpers/testHelpers');

describe('User Management API', () => {
  let adminToken;
  let userToken;
  let adminUser;
  let regularUser;

  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create admin user and get token
    adminUser = await createTestAdmin();
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminUser.email,
        password: 'admin123',
      });
    adminToken = adminLogin.body.token;

    // Create regular user and get token
    regularUser = await createTestUser();
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: regularUser.email,
        password: 'password123',
      });
    userToken = userLogin.body.token;
  });

  describe('GET /api/users', () => {
    it('should get all users as admin', async () => {
      await createTestUser({ email: 'user1@example.com' });
      await createTestUser({ email: 'user2@example.com' });

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users).toBeInstanceOf(Array);
      expect(response.body.users.length).toBeGreaterThanOrEqual(3); // admin + 2 users
      expect(response.body.users[0]).not.toHaveProperty('password');
    });

    it('should not allow regular users to get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.message).toContain('Admin privileges');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by id as admin', async () => {
      const newUser = await createTestUser({ email: 'newuser@example.com' });

      const response = await request(app)
        .get(`/api/users/${newUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should not allow regular users to get user by id', async () => {
      const response = await request(app)
        .get(`/api/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.message).toContain('Admin privileges');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user as admin', async () => {
      const newUser = await createTestUser({ email: 'update@example.com' });

      const response = await request(app)
        .put(`/api/users/${newUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
          role: 'admin',
          isActive: false,
        })
        .expect(200);

      expect(response.body.user.name).toBe('Updated Name');
      expect(response.body.user.role).toBe('admin');
      expect(response.body.user.isActive).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .put(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
        })
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should not allow regular users to update users', async () => {
      const response = await request(app)
        .put(`/api/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Name',
        })
        .expect(403);

      expect(response.body.message).toContain('Admin privileges');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user as admin', async () => {
      const newUser = await createTestUser({ email: 'delete@example.com' });

      const response = await request(app)
        .delete(`/api/users/${newUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toContain('deleted successfully');

      // Verify user is deleted
      const getResponse = await request(app)
        .get(`/api/users/${newUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should not allow regular users to delete users', async () => {
      const response = await request(app)
        .delete(`/api/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.message).toContain('Admin privileges');
    });
  });
});

