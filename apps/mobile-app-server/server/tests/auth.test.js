const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestDB, clearDatabase, createTestUser } = require('./helpers/testHelpers');
const User = require('../src/models/User');

// Import app AFTER setting up test environment
const app = require('../src/app');

describe('Authentication API', () => {
  beforeAll(async () => {
    await setupTestDB();
    // Ensure mongoose is connected
    if (mongoose.connection.readyState === 0) {
      await setupTestDB();
    }
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('john@example.com');
      expect(response.body.user.name).toBe('John Doe');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not register user with duplicate email', async () => {
      await createTestUser({ email: 'existing@example.com' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'existing@example.com',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.message).toContain('already exists');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: '12345', // Less than 6 characters
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should require all fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'john@example.com',
          // Missing name and password
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await clearDatabase();
      // Use a unique email for this test suite
      await createTestUser({
        email: 'logintest@example.com',
        password: 'password123',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('logintest@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should not login with inactive account', async () => {
      await User.findOneAndUpdate(
        { email: 'logintest@example.com' },
        { isActive: false }
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.message).toContain('deactivated');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user with valid token', async () => {
      await clearDatabase();
      const user = await createTestUser({
        email: 'metest@example.com',
        password: 'password123',
      });
      
      // Verify user exists in database
      const foundUser = await User.findOne({ email: user.email });
      expect(foundUser).toBeDefined();
      expect(foundUser._id.toString()).toBe(user._id.toString());
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'password123',
        })
        .expect(200);

      expect(loginResponse.body.token).toBeDefined();
      const token = loginResponse.body.token;
      
      // Verify token is valid by checking it can be decoded
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(user._id.toString());
      
      // Verify user still exists before making the request
      const userBeforeRequest = await User.findById(user._id);
      expect(userBeforeRequest).toBeDefined();

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user.email).toBe(user.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not get user without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    it('should not get user with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toBeDefined();
    });
  });
});

