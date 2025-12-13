const request = require('supertest');
const { setupTestDB, clearDatabase, createTestUser } = require('../helpers/testHelpers');
const app = require('../../src/app');
const User = require('../../src/models/User');
const { getWriteUserModel } = require('../../src/utils/db-helper');

describe('User Profile Management', () => {
  let userToken;
  let testUser;

  beforeAll(async () => {
    await setupTestDB();
    await clearDatabase();

    testUser = await createTestUser({
      email: 'profiletest@example.com',
      password: 'password123',
      name: 'Profile Test User',
    });

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'password123',
      });
    userToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await clearDatabase();
  });

  describe('GET /api/v1/profile', () => {
    it('should return current user profile', async () => {
      const response = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('refreshToken');
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v1/profile').expect(401);
    });
  });

  describe('PUT /api/v1/profile', () => {
    it('should update user name', async () => {
      const response = await request(app)
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Name',
        })
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.user.name).toBe('Updated Name');
      expect(response.body.user.email).toBe(testUser.email); // Email unchanged

      // Verify in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.name).toBe('Updated Name');
    });

    it('should update user email', async () => {
      const response = await request(app)
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'newemail@example.com',
        })
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.user.email).toBe('newemail@example.com');
      expect(response.body.user.emailVerified).toBe(false); // Email should be unverified after change

      // Verify in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.email).toBe('newemail@example.com');
      expect(updatedUser.emailVerified).toBe(false);
    });

    it('should reject duplicate email', async () => {
      // Create another user
      const otherUser = await createTestUser({
        email: 'duplicate@example.com',
        password: 'password123',
      });

      const response = await request(app)
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'duplicate@example.com',
        })
        .expect(409);

      expect(response.body.message).toBe('Email already registered');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/v1/profile')
        .send({ name: 'Test' })
        .expect(401);
    });
  });

  describe('PUT /api/v1/profile/password', () => {
    it('should change password with valid current password', async () => {
      const response = await request(app)
        .put('/api/v1/profile/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword456',
        })
        .expect(200);

      expect(response.body.message).toBe('Password changed successfully');

      // Wait a moment for password to be saved and hashed
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify new password works by fetching user directly and comparing
      const WriteUser = await getWriteUserModel();
      const updatedUser = await WriteUser.findById(testUser._id).select('+password');
      const isNewPasswordValid = await updatedUser.comparePassword('newpassword456');
      expect(isNewPasswordValid).toBe(true);

      // Verify old password no longer works
      const isOldPasswordValid = await updatedUser.comparePassword('password123');
      expect(isOldPasswordValid).toBe(false);
    });

    it('should reject password change with incorrect current password', async () => {
      const response = await request(app)
        .put('/api/v1/profile/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword789',
        })
        .expect(401);

      expect(response.body.message).toBe('Current password is incorrect');
    });

    it('should validate new password length', async () => {
      const response = await request(app)
        .put('/api/v1/profile/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'newpassword456',
          newPassword: 'short',
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should require current password', async () => {
      const response = await request(app)
        .put('/api/v1/profile/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          newPassword: 'newpassword123',
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/v1/profile/password')
        .send({
          currentPassword: 'old',
          newPassword: 'new',
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/profile/preferences', () => {
    it('should return default preferences if not set', async () => {
      const response = await request(app)
        .get('/api/v1/profile/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.preferences).toHaveProperty('notifications');
      expect(response.body.preferences.notifications.email).toBe(true);
      expect(response.body.preferences.notifications.push).toBe(true);
      expect(response.body.preferences.language).toBe('en');
      expect(response.body.preferences.theme).toBe('auto');
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v1/profile/preferences').expect(401);
    });
  });

  describe('PUT /api/v1/profile/preferences', () => {
    it('should update notification preferences', async () => {
      const response = await request(app)
        .put('/api/v1/profile/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          notifications: {
            email: false,
            push: true,
          },
        })
        .expect(200);

      expect(response.body.message).toBe('Preferences updated successfully');
      expect(response.body.preferences.notifications.email).toBe(false);
      expect(response.body.preferences.notifications.push).toBe(true);

      // Verify in database
      const user = await User.findById(testUser._id);
      expect(user.preferences.notifications.email).toBe(false);
      expect(user.preferences.notifications.push).toBe(true);
    });

    it('should update language preference', async () => {
      const response = await request(app)
        .put('/api/v1/profile/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          language: 'es',
        })
        .expect(200);

      expect(response.body.preferences.language).toBe('es');

      // Verify in database
      const user = await User.findById(testUser._id);
      expect(user.preferences.language).toBe('es');
    });

    it('should update theme preference', async () => {
      const response = await request(app)
        .put('/api/v1/profile/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          theme: 'dark',
        })
        .expect(200);

      expect(response.body.preferences.theme).toBe('dark');

      // Verify in database
      const user = await User.findById(testUser._id);
      expect(user.preferences.theme).toBe('dark');
    });

    it('should validate theme enum', async () => {
      const response = await request(app)
        .put('/api/v1/profile/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          theme: 'invalid-theme',
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should validate notification preferences are boolean', async () => {
      const response = await request(app)
        .put('/api/v1/profile/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          notifications: {
            email: 'not-a-boolean',
          },
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/v1/profile/preferences')
        .send({ theme: 'dark' })
        .expect(401);
    });
  });
});

