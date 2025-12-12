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

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
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

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
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

      expect(loginResponse.body.accessToken).toBeDefined();
      const token = loginResponse.body.accessToken;
      
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

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      await clearDatabase();
      const user = await createTestUser({
        email: 'refreshtest@example.com',
        password: 'password123',
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'refreshtest@example.com',
          password: 'password123',
        })
        .expect(200);

      const refreshToken = loginResponse.body.refreshToken;
      expect(refreshToken).toBeDefined();

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      // Access token should be new (or at least refresh token should be rotated)
      // Note: Access tokens might be identical if generated in same second, but refresh token should always be different
      expect(response.body.refreshToken).not.toBe(loginResponse.body.refreshToken);
      // Access token should be valid
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(response.body.accessToken, process.env.JWT_SECRET);
      expect(decoded.id).toBe(user._id.toString());
    });

    it('should return error for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.message).toContain('Invalid or expired');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email for existing user', async () => {
      await clearDatabase();
      await createTestUser({
        email: 'forgotpass@example.com',
        password: 'password123',
      });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'forgotpass@example.com' })
        .expect(200);

      expect(response.body.message).toContain('password reset link has been sent');
    });

    it('should return same message for non-existent user (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.message).toContain('password reset link has been sent');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      await clearDatabase();
      const user = await createTestUser({
        email: 'resetpass@example.com',
        password: 'oldpassword123',
      });

      // Get reset token from user (simulating forgot-password flow)
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000);
      await User.findByIdAndUpdate(user._id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'newpassword123',
        })
        .expect(200);

      expect(response.body.message).toContain('Password reset successfully');

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'resetpass@example.com',
          password: 'newpassword123',
        })
        .expect(200);

      expect(loginResponse.body.accessToken).toBeDefined();
    });

    it('should return error for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'newpassword123',
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid or expired');
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      await clearDatabase();
      const user = await createTestUser({
        email: 'verify@example.com',
        password: 'password123',
      });

      // Set verification token (simulating registration flow)
      const verificationToken = require('crypto').randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 86400000);
      await User.findByIdAndUpdate(user._id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
        emailVerified: false,
      });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body.message).toContain('Email verified successfully');

      // Verify user is now verified
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.emailVerified).toBe(true);
    });

    it('should return error for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body.message).toContain('Invalid or expired');
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should resend verification email for unverified user', async () => {
      await clearDatabase();
      await createTestUser({
        email: 'resendverify@example.com',
        password: 'password123',
        emailVerified: false,
      });

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'resendverify@example.com' })
        .expect(200);

      expect(response.body.message).toContain('verification email has been sent');
    });

    it('should return message for already verified user', async () => {
      await clearDatabase();
      await createTestUser({
        email: 'alreadyverified@example.com',
        password: 'password123',
        emailVerified: true,
      });

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'alreadyverified@example.com' })
        .expect(200);

      expect(response.body.message).toContain('already verified');
    });
  });
});

