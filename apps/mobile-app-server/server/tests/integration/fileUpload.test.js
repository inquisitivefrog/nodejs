/**
 * File Upload Integration Tests
 * Tests for profile picture upload and deletion
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { setupTestDB, clearDatabase, createTestUser } = require('../helpers/testHelpers');
const app = require('../../src/app');
const { getWriteUserModel } = require('../../src/utils/db-helper');

describe('File Upload', () => {
  let userToken;
  let testUser;
  const uploadsDir = path.join(__dirname, '../../uploads/profile-pictures');

  beforeAll(async () => {
    await setupTestDB();
    await clearDatabase();

    // Create test user
    testUser = await createTestUser({
      email: 'upload@test.com',
      password: 'password123',
      name: 'Upload Test User',
    });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'password123',
      });

    userToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Clean up uploaded files
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(uploadsDir, file));
      });
    }
    await clearDatabase();
  });

  describe('POST /api/v1/upload/profile-picture', () => {
    it('should upload profile picture successfully', async () => {
      // Create a test image file (1x1 PNG)
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const response = await request(app)
        .post('/api/v1/upload/profile-picture')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('profilePicture', testImageBuffer, 'test.png')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('profilePicture');
      // URL should start with /uploads/ (may have /uploads/uploads/ due to path structure, but should normalize)
      expect(response.body.profilePicture).toMatch(/^\/uploads\//);

      // Verify user was updated
      const WriteUser = await getWriteUserModel();
      const updatedUser = await WriteUser.findById(testUser._id);
      expect(updatedUser.profilePicture).toBe(response.body.profilePicture);
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/v1/upload/profile-picture')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('No file uploaded');
    });

    it('should reject non-image files', async () => {
      const textFile = Buffer.from('This is not an image');

      const response = await request(app)
        .post('/api/v1/upload/profile-picture')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('profilePicture', textFile, 'test.txt')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject files larger than 5MB', async () => {
      // Create a large buffer (6MB)
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');

      const response = await request(app)
        .post('/api/v1/upload/profile-picture')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('profilePicture', largeBuffer, 'large.png')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should require authentication', async () => {
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const response = await request(app)
        .post('/api/v1/upload/profile-picture')
        .attach('profilePicture', testImageBuffer, 'test.png')
        .expect(401);
    });

    it('should replace existing profile picture', async () => {
      // Upload first image
      const testImageBuffer1 = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const firstResponse = await request(app)
        .post('/api/v1/upload/profile-picture')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('profilePicture', testImageBuffer1, 'test1.png')
        .expect(200);

      const firstPictureUrl = firstResponse.body.profilePicture;

      // Upload second image
      const testImageBuffer2 = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const secondResponse = await request(app)
        .post('/api/v1/upload/profile-picture')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('profilePicture', testImageBuffer2, 'test2.png')
        .expect(200);

      // Verify new picture URL is different
      expect(secondResponse.body.profilePicture).not.toBe(firstPictureUrl);

      // Verify user has new picture
      const WriteUser = await getWriteUserModel();
      const updatedUser = await WriteUser.findById(testUser._id);
      expect(updatedUser.profilePicture).toBe(secondResponse.body.profilePicture);
    });
  });

  describe('DELETE /api/v1/upload/profile-picture', () => {
    beforeEach(async () => {
      // Upload a profile picture before each test
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      await request(app)
        .post('/api/v1/upload/profile-picture')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('profilePicture', testImageBuffer, 'test.png');
    });

    it('should delete profile picture successfully', async () => {
      const response = await request(app)
        .delete('/api/v1/upload/profile-picture')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted successfully');

      // Verify user profile picture is null
      const WriteUser = await getWriteUserModel();
      const updatedUser = await WriteUser.findById(testUser._id);
      expect(updatedUser.profilePicture).toBeNull();
    });

    it('should return error if no profile picture exists', async () => {
      // Delete once
      await request(app)
        .delete('/api/v1/upload/profile-picture')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Try to delete again
      const response = await request(app)
        .delete('/api/v1/upload/profile-picture')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('No profile picture to delete');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/v1/upload/profile-picture')
        .expect(401);
    });
  });

  describe('Profile Picture in User Response', () => {
    it('should include profile picture URL in user response', async () => {
      // Upload profile picture
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const uploadResponse = await request(app)
        .post('/api/v1/upload/profile-picture')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('profilePicture', testImageBuffer, 'test.png')
        .expect(200);

      // Get user profile
      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(meResponse.body.user).toHaveProperty('profilePicture');
      expect(meResponse.body.user.profilePicture).toBe(uploadResponse.body.profilePicture);
    });
  });
});

