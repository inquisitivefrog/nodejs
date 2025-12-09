const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestDB, clearDatabase, createTestUser, createTestAdmin } = require('./helpers/testHelpers');

// Ensure mongoose connection is established before importing app

// Import app AFTER setting up test environment
// This ensures the app uses the same database connection
const app = require('../src/app');

describe('User Management API', () => {
  let adminToken;
  let userToken;
  let adminUser;
  let regularUser;

  beforeAll(async () => {
    await setupTestDB();
    // Ensure mongoose is connected and ready
    if (mongoose.connection.readyState !== 1) {
      await setupTestDB();
    }
    // Verify connection
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
    // Verify we're using the test database
    const dbName = mongoose.connection.db.databaseName;
    expect(dbName).toBe('mobileapp-test');
  });

  beforeEach(async () => {
    // Ensure database connection is ready
    if (mongoose.connection.readyState !== 1) {
      await setupTestDB();
    }
    
    await clearDatabase();
    const User = require('../src/models/User');
    const jwt = require('jsonwebtoken');

    // Verify database is connected
    expect(mongoose.connection.readyState).toBe(1);

    // Create admin user and get token
    adminUser = await createTestAdmin({
      email: 'admin@test.com',
      password: 'admin123',
    });
    
    // Verify admin user was created
    expect(adminUser).toBeDefined();
    expect(adminUser._id).toBeDefined();
    
    // Verify user was saved to database
    const verifyAdmin = await User.findById(adminUser._id);
    expect(verifyAdmin).toBeDefined();
    expect(verifyAdmin.email).toBe(adminUser.email);
    
    // Verify user exists in database before login
    const foundAdmin = await User.findOne({ email: adminUser.email });
    if (!foundAdmin) {
      // List all users to debug
      const allUsers = await User.find().select('email _id');
      throw new Error(`Admin user not found. Created ID: ${adminUser._id}, Email: ${adminUser.email}. All users: ${JSON.stringify(allUsers)}`);
    }
    expect(foundAdmin._id.toString()).toBe(adminUser._id.toString());
    
    // Test password comparison directly (password hashing is tested in model tests)
    // We need to fetch with password to compare
    const adminWithPassword = await User.findOne({ email: adminUser.email }).select('+password');
    const passwordMatch = await adminWithPassword.comparePassword('admin123');
    if (!passwordMatch) {
      throw new Error('Password comparison failed - password might not be hashed correctly');
    }
    
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminUser.email,
        password: 'admin123',
      });
    
    if (adminLogin.status !== 200) {
      // Check if user still exists
      const userCheck = await User.findById(adminUser._id);
      const userByEmail = await User.findOne({ email: adminUser.email });
      const allUsers = await User.find().select('email _id role');
      console.error('Admin login failed:', {
        status: adminLogin.status,
        body: adminLogin.body,
        adminEmail: adminUser.email,
        adminId: adminUser._id,
        userExistsById: userCheck ? 'yes' : 'no',
        userExistsByEmail: userByEmail ? 'yes' : 'no',
        allUsers: allUsers,
        dbName: mongoose.connection.db.databaseName
      });
      throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.body)}`);
    }
    
    expect(adminLogin.status).toBe(200);
    expect(adminLogin.body.token).toBeDefined();
    adminToken = adminLogin.body.token;
    
    // Verify token contains correct user ID
    const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
    expect(decoded.id).toBe(adminUser._id.toString());
    
    // Verify user still exists after token generation
    const adminAfterToken = await User.findById(adminUser._id);
    if (!adminAfterToken) {
      throw new Error(`Admin user ${adminUser._id} was deleted after token generation`);
    }

    // Verify admin still exists before creating regular user
    const adminBeforeRegular = await User.findById(adminUser._id);
    if (!adminBeforeRegular) {
      throw new Error(`Admin user ${adminUser._id} was deleted before creating regular user`);
    }
    
    // Create regular user and get token
    regularUser = await createTestUser({
      email: 'user@test.com',
      password: 'password123',
    });
    
    expect(regularUser).toBeDefined();
    expect(regularUser._id).toBeDefined();
    
    // Verify admin still exists after creating regular user
    const adminAfterRegular = await User.findById(adminUser._id);
    if (!adminAfterRegular) {
      throw new Error(`Admin user ${adminUser._id} was deleted after creating regular user`);
    }
    
    // Verify user exists in database
    const foundUser = await User.findOne({ email: regularUser.email });
    if (!foundUser) {
      throw new Error(`Regular user not found in database after creation. Email: ${regularUser.email}`);
    }
    
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: regularUser.email,
        password: 'password123',
      });
    
    if (userLogin.status !== 200) {
      console.error('User login failed:', {
        status: userLogin.status,
        body: userLogin.body,
        userEmail: regularUser.email,
        userId: regularUser._id
      });
      throw new Error(`User login failed: ${JSON.stringify(userLogin.body)}`);
    }
    
    expect(userLogin.status).toBe(200);
    expect(userLogin.body.token).toBeDefined();
    userToken = userLogin.body.token;
    
    // Verify token contains correct user ID
    const decodedUser = jwt.verify(userToken, process.env.JWT_SECRET);
    expect(decodedUser.id).toBe(regularUser._id.toString());
    
    // Final check: verify both users still exist
    const finalAdminCheck = await User.findById(adminUser._id);
    const finalUserCheck = await User.findById(regularUser._id);
    if (!finalAdminCheck || !finalUserCheck) {
      throw new Error(`Users deleted: admin=${!!finalAdminCheck}, user=${!!finalUserCheck}`);
    }
  });

  describe('GET /api/users', () => {
    it('should get all users as admin', async () => {
      // Verify admin token is valid first
      expect(adminToken).toBeDefined();
      expect(adminUser).toBeDefined();
      
      // Verify admin user still exists in database
      const User = require('../src/models/User');
      const adminStillExists = await User.findById(adminUser._id);
      if (!adminStillExists) {
        throw new Error(`Admin user ${adminUser._id} does not exist before creating test users`);
      }
      
      // Verify token is valid
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
      expect(decoded.id).toBe(adminUser._id.toString());
      
      // Count users before creating test users
      const userCountBefore = await User.countDocuments();
      expect(userCountBefore).toBeGreaterThanOrEqual(1); // At least admin
      
      await createTestUser({ email: 'user1@example.com' });
      
      // Check admin still exists after first user creation
      const adminAfterFirst = await User.findById(adminUser._id);
      const userCountAfterFirst = await User.countDocuments();
      if (!adminAfterFirst) {
        console.error('Admin deleted after first user:', {
          adminId: adminUser._id,
          userCountBefore,
          userCountAfterFirst,
          allUsers: await User.find().select('email _id')
        });
        throw new Error(`Admin user ${adminUser._id} was deleted after creating first test user`);
      }
      
      await createTestUser({ email: 'user2@example.com' });
      
      // Verify admin still exists after creating other users
      const adminAfterCreate = await User.findById(adminUser._id);
      const userCountAfterCreate = await User.countDocuments();
      if (!adminAfterCreate) {
        console.error('Admin deleted after creating test users:', {
          adminId: adminUser._id,
          userCountBefore,
          userCountAfterCreate,
          allUsers: await User.find().select('email _id')
        });
        throw new Error(`Admin user ${adminUser._id} was deleted after creating test users`);
      }
      
      expect(userCountAfterCreate).toBe(4); // admin + regular user + 2 test users

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      if (response.status !== 200) {
        console.error('GET /api/users failed:', {
          status: response.status,
          body: response.body,
          adminToken: adminToken ? 'exists' : 'missing',
          adminUserId: adminUser._id,
          adminExists: adminAfterCreate ? 'yes' : 'no'
        });
      }

      expect(response.status).toBe(200);
      expect(response.body.users).toBeInstanceOf(Array);
      expect(response.body.users.length).toBeGreaterThanOrEqual(4); // admin + regular user + 2 test users
      expect(response.body.users[0]).not.toHaveProperty('password');
    });

    it('should not allow regular users to get all users', async () => {
      // Verify user token is valid first
      expect(userToken).toBeDefined();
      expect(regularUser).toBeDefined();
      
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);

      if (response.status !== 403) {
        console.error('GET /api/users with user token:', {
          status: response.status,
          body: response.body,
          userToken: userToken ? 'exists' : 'missing',
          userId: regularUser._id
        });
      }

      expect(response.status).toBe(403);
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
      // Verify admin token is still valid
      expect(adminToken).toBeDefined();
      
      const newUser = await createTestUser({ email: 'newuser@example.com' });

      const response = await request(app)
        .get(`/api/users/${newUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (response.status !== 200) {
        console.error('GET /api/users/:id failed:', {
          status: response.status,
          body: response.body,
          adminToken: adminToken ? 'exists' : 'missing'
        });
      }

      expect(response.status).toBe(200);
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

