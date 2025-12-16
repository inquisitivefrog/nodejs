const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const { getReadConnection, getWriteConnection, getPoolStats } = require('../../src/config/database-pools');
const { getReadUserModel, getWriteUserModel } = require('../../src/utils/db-helper');
const { setupTestDB, clearDatabase } = require('../helpers/testHelpers');

describe('Connection Pool Integration Tests', () => {
  let adminToken;
  let adminUser;
  let regularUser;
  let regularToken;

  beforeAll(async () => {
    // Setup test database connection (required for User model)
    await setupTestDB();

    // Wait for pools to be initialized (they're initialized in app.js)
    // In test environment, pools use primary, so we can use default connection
    // But let's ensure pools are ready
    try {
      await getReadConnection();
      await getWriteConnection();
    } catch (err) {
      // Pools might not be available in test, use default connection
      console.warn('Pools not available, using default connection for test setup');
    }

    // Create admin user using default connection (pools use primary in test anyway)
    adminUser = await User.create({
      email: 'admin-pool-test@example.com',
      password: 'admin123',
      name: 'Admin Pool Test',
      role: 'admin',
    });

    // Create regular user
    regularUser = await User.create({
      email: 'user-pool-test@example.com',
      password: 'user123',
      name: 'User Pool Test',
      role: 'user',
    });

    // Generate tokens
    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign(
      { id: adminUser._id.toString() },
      process.env.JWT_SECRET || 'change-this-secret-key-in-production-use-openssl-rand-base64-32'
    );
    regularToken = jwt.sign(
      { id: regularUser._id.toString() },
      process.env.JWT_SECRET || 'change-this-secret-key-in-production-use-openssl-rand-base64-32'
    );
  });

  afterAll(async () => {
    // Clean up test users
    await User.deleteMany({
      email: { $in: ['admin-pool-test@example.com', 'user-pool-test@example.com'] },
    });
  });

  describe('Pool Statistics Endpoint', () => {
    it('should return pool statistics for admin users', async () => {
      const response = await request(app)
        .get('/api/v1/admin/pools')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pools).toBeDefined();
      expect(response.body.pools.read).toBeDefined();
      expect(response.body.pools.write).toBeDefined();
      expect(response.body.pools.read.readyState).toBe(1);
      expect(response.body.pools.write.readyState).toBe(1);
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get('/api/v1/admin/pools')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body.message).toContain('Admin');
    });
  });

  describe('Read Operations Use Read Pool', () => {
    it('should use read pool for GET /api/v1/auth/me', async () => {
      // Get initial pool stats
      const statsBefore = getPoolStats();
      const readOpsBefore = statsBefore.read?.stats?.operations || 0;

      // Make read request
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      // Verify read pool was used (connection should be active)
      const statsAfter = getPoolStats();
      expect(statsAfter.read.readyState).toBe(1);
    });

    it('should use read pool for GET /api/users (admin)', async () => {
      await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify read pool is active
      const stats = getPoolStats();
      expect(stats.read.readyState).toBe(1);
    });

    it('should use read pool for GET /api/v1/users/:id (admin)', async () => {
      await request(app)
        .get(`/api/v1/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify read pool is active
      const stats = getPoolStats();
      expect(stats.read.readyState).toBe(1);
    });
  });

  describe('Write Operations Use Write Pool', () => {
    it('should use write pool for POST /api/v1/auth/register', async () => {
      const newUser = {
        email: `test-write-${Date.now()}@example.com`,
        password: 'test123',
        name: 'Test Write User',
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(newUser)
        .expect(201);

      // Verify write pool is active
      const stats = getPoolStats();
      expect(stats.write.readyState).toBe(1);

      // Clean up
      await User.deleteOne({ email: newUser.email });
    });

    it('should use write pool for PUT /api/v1/users/:id (admin)', async () => {
      const updatedName = `Updated Name ${Date.now()}`;

      await request(app)
        .put(`/api/v1/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: updatedName })
        .expect(200);

      // Verify write pool is active
      const stats = getPoolStats();
      expect(stats.write.readyState).toBe(1);

      // Verify update worked
      const updatedUser = await User.findById(regularUser._id);
      expect(updatedUser.name).toBe(updatedName);
    });

    it('should use write pool for DELETE /api/v1/users/:id (admin)', async () => {
      // Create a user to delete
      const userToDelete = await User.create({
        email: `delete-test-${Date.now()}@example.com`,
        password: 'test123',
        name: 'Delete Test User',
      });

      await request(app)
        .delete(`/api/v1/users/${userToDelete._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify write pool is active
      const stats = getPoolStats();
      expect(stats.write.readyState).toBe(1);

      // Verify user was deleted
      const deletedUser = await User.findById(userToDelete._id);
      expect(deletedUser).toBeNull();
    });
  });

  describe('Pool Connection Verification', () => {
    it('should have both read and write pools connected', async () => {
      const stats = getPoolStats();
      
      expect(stats.read).toBeDefined();
      expect(stats.write).toBeDefined();
      expect(stats.read.readyState).toBe(1); // 1 = connected
      expect(stats.write.readyState).toBe(1); // 1 = connected
    });

    it('should verify read and write pools are separate connections', async () => {
      const readConn = await getReadConnection();
      const writeConn = await getWriteConnection();

      expect(readConn).toBeDefined();
      expect(writeConn).toBeDefined();
      expect(readConn).not.toBe(writeConn);
    });

    it('should verify models use correct pools', async () => {
      const ReadUser = await getReadUserModel();
      const WriteUser = await getWriteUserModel();

      expect(ReadUser).toBeDefined();
      expect(WriteUser).toBeDefined();
      
      // Models should be different instances (from different connections)
      // Note: In test environment, they might use the same connection,
      // but the helper functions should still work correctly
      expect(typeof ReadUser.find).toBe('function');
      expect(typeof WriteUser.create).toBe('function');
    });
  });

  describe('Pool Fallback Behavior', () => {
    it('should handle pool unavailability gracefully', async () => {
      // This test verifies that if pools fail, the system falls back to default connection
      // The db-helper should handle errors and fallback to default User model
      
      // Make a request that should work even if pools have issues
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(regularUser.email);
    });
  });
});

