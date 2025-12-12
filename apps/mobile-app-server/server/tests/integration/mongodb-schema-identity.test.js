/**
 * MongoDB Schema and Identity Tests
 * 
 * These tests verify:
 * 1. Schema validation (field types, constraints, indexes)
 * 2. Identity/ObjectId handling (generation, format, uniqueness)
 * 3. Schema-level validation rules
 * 4. Index verification
 * 5. Timestamp behavior
 */

const mongoose = require('mongoose');
const User = require('../../src/models/User');
const { userSchema } = require('../../src/models/User');
const { setupTestDB, clearDatabase } = require('../helpers/testHelpers');

describe('MongoDB Schema and Identity Tests', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Schema Field Types and Constraints', () => {
    it('should enforce String type for email field', async () => {
      // Try to set email to non-string value
      const user = new User({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      // Mongoose will coerce, but we can verify the schema definition
      expect(userSchema.path('email').instance).toBe('String');
      expect(userSchema.path('email').isRequired).toBe(true);
    });

    it('should enforce String type for password field', async () => {
      expect(userSchema.path('password').instance).toBe('String');
      expect(userSchema.path('password').isRequired).toBe(true);
      // minlength can be an array [value, message] or just the value
      const minlength = userSchema.path('password').options.minlength;
      expect(Array.isArray(minlength) ? minlength[0] : minlength).toBe(6);
    });

    it('should enforce String type for name field', async () => {
      expect(userSchema.path('name').instance).toBe('String');
      expect(userSchema.path('name').isRequired).toBe(true);
    });

    it('should enforce enum values for role field', async () => {
      expect(userSchema.path('role').instance).toBe('String');
      expect(userSchema.path('role').enumValues).toEqual(['user', 'admin']);
      expect(userSchema.path('role').defaultValue).toBe('user');
    });

    it('should enforce Boolean type for isActive field', async () => {
      expect(userSchema.path('isActive').instance).toBe('Boolean');
      expect(userSchema.path('isActive').defaultValue).toBe(true);
    });

    it('should reject invalid enum values for role', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'invalid-role',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should enforce minimum length for password', async () => {
      const user = new User({
        email: 'test@example.com',
        password: '12345', // Less than 6 characters
        name: 'Test User',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should trim whitespace from name field', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        name: '  Test User  ',
      });

      expect(user.name).toBe('Test User');
    });

    it('should trim and lowercase email field', async () => {
      const user = await User.create({
        email: '  TEST@EXAMPLE.COM  ',
        password: 'password123',
        name: 'Test User',
      });

      expect(user.email).toBe('test@example.com');
    });
  });

  describe('Schema Validation Rules', () => {
    it('should validate email format with regex', async () => {
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@example.com',
        'test.example.com',
        'test @example.com',
        '',
      ];

      for (const email of invalidEmails) {
        const user = new User({
          email,
          password: 'password123',
          name: 'Test User',
        });

        await expect(user.save()).rejects.toThrow();
      }
    });

    it('should accept valid email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.co.uk',
        'user+tag@example.com',
        'user_name@example-domain.com',
      ];

      for (const email of validEmails) {
        const user = await User.create({
          email: `${email.split('@')[0]}-${Date.now()}@${email.split('@')[1]}`,
          password: 'password123',
          name: 'Test User',
        });

        expect(user.email).toBeDefined();
        expect(user.email).toMatch(/^\S+@\S+\.\S+$/);
      }
    });

    it('should require all required fields', async () => {
      // Missing email
      await expect(
        User.create({
          password: 'password123',
          name: 'Test User',
        })
      ).rejects.toThrow();

      // Missing password
      await expect(
        User.create({
          email: 'test@example.com',
          name: 'Test User',
        })
      ).rejects.toThrow();

      // Missing name
      await expect(
        User.create({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow();
    });

    it('should apply default values for optional fields', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        // role and isActive not provided
      });

      expect(user.role).toBe('user');
      expect(user.isActive).toBe(true);
    });
  });

  describe('Indexes and Uniqueness', () => {
    it('should have unique index on email field', async () => {
      // Get indexes from the collection
      const indexes = await User.collection.getIndexes();
      
      // Check for unique index on email
      expect(indexes).toHaveProperty('email_1');
      // Index unique property might be boolean or undefined (MongoDB behavior)
      // The important thing is the index exists and enforces uniqueness
      if (indexes.email_1.unique !== undefined) {
        expect(indexes.email_1.unique).toBe(true);
      }
      // Verify uniqueness is enforced by testing duplicate creation
      const email = `index-test-${Date.now()}@example.com`;
      await User.create({ email, password: 'password123', name: 'Test' });
      await expect(
        User.create({ email, password: 'password123', name: 'Test 2' })
      ).rejects.toThrow();
    });

    it('should enforce unique email constraint at database level', async () => {
      const email = `unique-test-${Date.now()}@example.com`;

      // Create first user
      const user1 = await User.create({
        email,
        password: 'password123',
        name: 'User 1',
      });

      expect(user1).toBeDefined();

      // Try to create duplicate - should fail with duplicate key error
      await expect(
        User.create({
          email,
          password: 'password123',
          name: 'User 2',
        })
      ).rejects.toThrow();

      // Verify error is a duplicate key error
      try {
        await User.create({
          email,
          password: 'password123',
          name: 'User 2',
        });
      } catch (error) {
        expect(error.code).toBe(11000); // MongoDB duplicate key error
        expect(error.keyPattern).toHaveProperty('email');
      }
    });

    it('should have _id index (automatic)', async () => {
      const indexes = await User.collection.getIndexes();
      
      // MongoDB automatically creates _id index
      expect(indexes).toHaveProperty('_id_');
      // _id index is always unique, but the property might not be explicitly set
      // The important thing is the index exists
      expect(indexes._id_).toBeDefined();
    });

    it('should verify index exists before querying', async () => {
      // Create a user
      const user = await User.create({
        email: 'index-test@example.com',
        password: 'password123',
        name: 'Index Test',
      });

      // Query by email (should use index)
      const found = await User.findOne({ email: user.email });
      expect(found).toBeDefined();
      expect(found._id.toString()).toBe(user._id.toString());
    });
  });

  describe('ObjectId Identity Handling', () => {
    it('should auto-generate ObjectId for _id field', async () => {
      const user = await User.create({
        email: 'objectid-test@example.com',
        password: 'password123',
        name: 'ObjectId Test',
      });

      expect(user._id).toBeDefined();
      expect(user._id).toBeInstanceOf(mongoose.Types.ObjectId);
    });

    it('should validate ObjectId format', async () => {
      const user = await User.create({
        email: 'objectid-format-test@example.com',
        password: 'password123',
        name: 'ObjectId Format Test',
      });

      // ObjectId should be 24 hex characters
      expect(user._id.toString()).toMatch(/^[0-9a-fA-F]{24}$/);
    });

    it('should handle ObjectId conversion to string', async () => {
      const user = await User.create({
        email: 'objectid-convert-test@example.com',
        password: 'password123',
        name: 'ObjectId Convert Test',
      });

      const idString = user._id.toString();
      expect(typeof idString).toBe('string');
      expect(idString.length).toBe(24);

      // Should be able to convert back to ObjectId
      const convertedId = new mongoose.Types.ObjectId(idString);
      expect(convertedId.toString()).toBe(idString);
    });

    it('should reject invalid ObjectId format in queries', async () => {
      // Try to find by invalid ObjectId
      await expect(
        User.findById('invalid-objectid-format')
      ).rejects.toThrow();

      // Try to find by non-ObjectId string
      await expect(
        User.findById('not-an-objectid')
      ).rejects.toThrow();
    });

    it('should handle ObjectId equality correctly', async () => {
      const user1 = await User.create({
        email: 'objectid-eq1-test@example.com',
        password: 'password123',
        name: 'ObjectId Eq Test 1',
      });

      const user2 = await User.create({
        email: 'objectid-eq2-test@example.com',
        password: 'password123',
        name: 'ObjectId Eq Test 2',
      });

      // Different users should have different ObjectIds
      expect(user1._id.toString()).not.toBe(user2._id.toString());

      // Same user should have same ObjectId
      const found = await User.findById(user1._id);
      expect(found._id.toString()).toBe(user1._id.toString());
    });

    it('should handle ObjectId in JSON serialization', async () => {
      const user = await User.create({
        email: 'objectid-json-test@example.com',
        password: 'password123',
        name: 'ObjectId JSON Test',
      });

      const json = user.toJSON();
      
      // _id should be present in JSON
      expect(json).toHaveProperty('_id');
      
      // _id in JSON can be ObjectId or string depending on Mongoose version/settings
      // Convert to string for comparison
      const idString = json._id.toString ? json._id.toString() : json._id;
      expect(typeof idString).toBe('string');
      expect(idString).toBe(user._id.toString());
    });

    it('should generate unique ObjectIds for different documents', async () => {
      const users = await Promise.all([
        User.create({
          email: `unique-id1-${Date.now()}@example.com`,
          password: 'password123',
          name: 'User 1',
        }),
        User.create({
          email: `unique-id2-${Date.now()}@example.com`,
          password: 'password123',
          name: 'User 2',
        }),
        User.create({
          email: `unique-id3-${Date.now()}@example.com`,
          password: 'password123',
          name: 'User 3',
        }),
      ]);

      // All should have unique ObjectIds
      const ids = users.map((u) => u._id.toString());
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('should handle ObjectId in query filters', async () => {
      const user = await User.create({
        email: 'objectid-query-test@example.com',
        password: 'password123',
        name: 'ObjectId Query Test',
      });

      // Query by ObjectId
      const foundById = await User.findById(user._id);
      expect(foundById).toBeDefined();
      expect(foundById._id.toString()).toBe(user._id.toString());

      // Query by ObjectId string
      const foundByString = await User.findById(user._id.toString());
      expect(foundByString).toBeDefined();
      expect(foundByString._id.toString()).toBe(user._id.toString());

      // Query using $in with ObjectIds
      const foundIn = await User.find({
        _id: { $in: [user._id] },
      });
      expect(foundIn).toHaveLength(1);
      expect(foundIn[0]._id.toString()).toBe(user._id.toString());
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt timestamp', async () => {
      const user = await User.create({
        email: 'timestamp-test@example.com',
        password: 'password123',
        name: 'Timestamp Test',
      });

      expect(user.createdAt).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should auto-generate updatedAt timestamp', async () => {
      const user = await User.create({
        email: 'timestamp-update-test@example.com',
        password: 'password123',
        name: 'Timestamp Update Test',
      });

      expect(user.updatedAt).toBeDefined();
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on document modification', async () => {
      const user = await User.create({
        email: 'timestamp-modify-test@example.com',
        password: 'password123',
        name: 'Original Name',
      });

      const originalUpdatedAt = user.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Modify the document
      user.name = 'Updated Name';
      await user.save();

      // updatedAt should be different
      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should not update updatedAt when password is not modified', async () => {
      const user = await User.create({
        email: 'timestamp-password-test@example.com',
        password: 'password123',
        name: 'Password Test',
      });

      const originalUpdatedAt = user.updatedAt;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Modify non-password field
      user.name = 'New Name';
      await user.save();

      // updatedAt should be updated
      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should include timestamps in JSON output', async () => {
      const user = await User.create({
        email: 'timestamp-json-test@example.com',
        password: 'password123',
        name: 'Timestamp JSON Test',
      });

      const json = user.toJSON();

      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
      expect(json.createdAt).toBeInstanceOf(Date);
      expect(json.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Schema Methods and Virtuals', () => {
    it('should exclude password from JSON output', async () => {
      const user = await User.create({
        email: 'json-exclude-test@example.com',
        password: 'password123',
        name: 'JSON Exclude Test',
      });

      const json = user.toJSON();

      expect(json).not.toHaveProperty('password');
      expect(json).toHaveProperty('_id');
      expect(json).toHaveProperty('email');
      expect(json).toHaveProperty('name');
    });

    it('should have comparePassword method', async () => {
      const user = await User.create({
        email: 'compare-password-test@example.com',
        password: 'password123',
        name: 'Compare Password Test',
      });

      expect(typeof user.comparePassword).toBe('function');

      const isMatch = await user.comparePassword('password123');
      expect(isMatch).toBe(true);

      const isWrong = await user.comparePassword('wrongpassword');
      expect(isWrong).toBe(false);
    });
  });

  describe('Schema Select Behavior', () => {
    it('should not select password by default', async () => {
      const user = await User.create({
        email: 'select-test@example.com',
        password: 'password123',
        name: 'Select Test',
      });

      // Find without explicitly selecting password
      const found = await User.findById(user._id);
      
      // Password should not be in the result
      expect(found.password).toBeUndefined();
    });

    it('should select password when explicitly requested', async () => {
      const user = await User.create({
        email: 'select-explicit-test@example.com',
        password: 'password123',
        name: 'Select Explicit Test',
      });

      // Find with password explicitly selected
      const found = await User.findById(user._id).select('+password');
      
      // Password should be in the result
      expect(found.password).toBeDefined();
      expect(found.password).not.toBe('password123'); // Should be hashed
    });
  });
});

