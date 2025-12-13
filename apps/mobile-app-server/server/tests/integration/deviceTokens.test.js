const request = require('supertest');
const { setupTestDB, clearDatabase, createTestUser } = require('../helpers/testHelpers');
const app = require('../../src/app');
const DeviceToken = require('../../src/models/DeviceToken');
const User = require('../../src/models/User');

describe('Device Token Management', () => {
  let userToken;
  let testUser;

  beforeAll(async () => {
    await setupTestDB();
    await clearDatabase();

    testUser = await createTestUser({
      email: 'devicetest@example.com',
      password: 'password123',
      name: 'Device Test User',
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

  describe('POST /api/v1/devices/register', () => {
    it('should register a new device token', async () => {
      const response = await request(app)
        .post('/api/v1/devices/register')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          token: 'test-device-token-123',
          platform: 'ios',
          deviceId: 'iPhone-12-Pro',
          appVersion: '1.0.0',
        })
        .expect(200);

      expect(response.body.message).toBe('Device token registered successfully');
      expect(response.body.deviceToken).toHaveProperty('id');
      expect(response.body.deviceToken.platform).toBe('ios');
      expect(response.body.deviceToken.deviceId).toBe('iPhone-12-Pro');
      expect(response.body.deviceToken.appVersion).toBe('1.0.0');
      expect(response.body.deviceToken.isActive).toBe(true);
    });

    it('should update existing device token for same user', async () => {
      // Register initial token
      await request(app)
        .post('/api/v1/devices/register')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          token: 'existing-token-456',
          platform: 'android',
        })
        .expect(200);

      // Update the same token
      const response = await request(app)
        .post('/api/v1/devices/register')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          token: 'existing-token-456',
          platform: 'android',
          deviceId: 'Samsung-Galaxy',
          appVersion: '1.1.0',
        })
        .expect(200);

      expect(response.body.message).toBe('Device token registered successfully');
      expect(response.body.deviceToken.deviceId).toBe('Samsung-Galaxy');
      expect(response.body.deviceToken.appVersion).toBe('1.1.0');

      // Verify only one token exists
      const tokens = await DeviceToken.find({ token: 'existing-token-456' });
      expect(tokens.length).toBe(1);
    });

    it('should transfer token to new user if token belongs to different user', async () => {
      // Create another user
      const otherUser = await createTestUser({
        email: 'otheruser@example.com',
        password: 'password123',
      });

      const otherLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: otherUser.email,
          password: 'password123',
        });
      const otherUserToken = otherLoginResponse.body.accessToken;

      // Register token for other user
      await request(app)
        .post('/api/v1/devices/register')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          token: 'shared-token-789',
          platform: 'web',
        })
        .expect(200);

      // Register same token for test user (should transfer)
      const response = await request(app)
        .post('/api/v1/devices/register')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          token: 'shared-token-789',
          platform: 'web',
        })
        .expect(200);

      // Verify token now belongs to test user
      const token = await DeviceToken.findOne({ token: 'shared-token-789' });
      expect(token.userId.toString()).toBe(testUser._id.toString());
      expect(token.isActive).toBe(true);

      // Verify old token for other user is deactivated
      const oldTokens = await DeviceToken.find({
        userId: otherUser._id,
        token: 'shared-token-789',
      });
      expect(oldTokens.length).toBe(0); // Should be transferred, not duplicated
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/devices/register')
        .send({
          token: 'test-token',
          platform: 'ios',
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/devices/register')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          platform: 'ios',
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should validate platform enum', async () => {
      const response = await request(app)
        .post('/api/v1/devices/register')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          token: 'test-token',
          platform: 'invalid-platform',
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/v1/devices', () => {
    beforeEach(async () => {
      // Clean up any existing tokens first
      await DeviceToken.deleteMany({ userId: testUser._id });
      
      // Register some test devices
      await DeviceToken.create({
        userId: testUser._id,
        token: 'token-1',
        platform: 'ios',
        isActive: true,
      });
      await DeviceToken.create({
        userId: testUser._id,
        token: 'token-2',
        platform: 'android',
        isActive: true,
      });
      await DeviceToken.create({
        userId: testUser._id,
        token: 'token-3',
        platform: 'web',
        isActive: false, // Inactive token
      });
    });

    afterEach(async () => {
      await DeviceToken.deleteMany({ userId: testUser._id });
    });

    it('should return only active device tokens for user', async () => {
      const response = await request(app)
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.devices).toHaveLength(2); // Only active tokens
      expect(response.body.devices.every((d) => d.isActive === true)).toBe(true);
      expect(response.body.devices.some((d) => d.platform === 'ios')).toBe(true);
      expect(response.body.devices.some((d) => d.platform === 'android')).toBe(true);
    });

    it('should not return token values (security)', async () => {
      const response = await request(app)
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      response.body.devices.forEach((device) => {
        expect(device).not.toHaveProperty('token');
      });
    });

    it('should require authentication', async () => {
      await request(app).get('/api/v1/devices').expect(401);
    });
  });

  describe('DELETE /api/v1/devices/:token', () => {
    beforeEach(async () => {
      await DeviceToken.create({
        userId: testUser._id,
        token: 'delete-token-123',
        platform: 'ios',
        isActive: true,
      });
    });

    afterEach(async () => {
      await DeviceToken.deleteMany({ userId: testUser._id });
    });

    it('should deactivate device token', async () => {
      const response = await request(app)
        .delete('/api/v1/devices/delete-token-123')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.message).toBe('Device token unregistered successfully');

      // Verify token is deactivated
      const token = await DeviceToken.findOne({ token: 'delete-token-123' });
      expect(token.isActive).toBe(false);
    });

    it('should return 404 for non-existent token', async () => {
      await request(app)
        .delete('/api/v1/devices/non-existent-token')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should only allow user to delete their own tokens', async () => {
      // Create another user
      const otherUser = await createTestUser({
        email: 'otheruser2@example.com',
        password: 'password123',
      });

      const otherLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: otherUser.email,
          password: 'password123',
        });
      const otherUserToken = otherLoginResponse.body.accessToken;

      // Try to delete test user's token with other user's token
      await request(app)
        .delete('/api/v1/devices/delete-token-123')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404); // Should not find token (belongs to different user)
    });

    it('should require authentication', async () => {
      await request(app).delete('/api/v1/devices/some-token').expect(401);
    });
  });
});

