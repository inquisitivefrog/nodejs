const mongoose = require('mongoose');
const { setupTestDB, clearDatabase } = require('../helpers/testHelpers');

// Import User model AFTER setting up test environment
const User = require('../../src/models/User');

describe('User Model', () => {
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

  it('should create a new user', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    const user = await User.create(userData);

    expect(user.email).toBe(userData.email);
    expect(user.name).toBe(userData.name);
    expect(user.password).not.toBe(userData.password); // Should be hashed
    expect(user.role).toBe('user'); // Default role
    expect(user.isActive).toBe(true); // Default active status
  });

  it('should hash password before saving', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    const user = await User.create(userData);
    expect(user.password).not.toBe('password123');
    expect(user.password.length).toBeGreaterThan(20); // bcrypt hash length
  });

  it('should not return password in JSON', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });

    const userJSON = user.toJSON();
    expect(userJSON).not.toHaveProperty('password');
  });

  it('should compare password correctly', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });

    const isMatch = await user.comparePassword('password123');
    expect(isMatch).toBe(true);

    const isWrong = await user.comparePassword('wrongpassword');
    expect(isWrong).toBe(false);
  });

  it('should require email', async () => {
    const userData = {
      password: 'password123',
      name: 'Test User',
    };

    await expect(User.create(userData)).rejects.toThrow();
  });

  it('should require unique email', async () => {
    const firstUser = await User.create({
      email: 'unique-test@example.com',
      password: 'password123',
      name: 'Test User',
    });
    
    expect(firstUser).toBeDefined();
    expect(firstUser.email).toBe('unique-test@example.com');

    // Try to create another user with the same email - should fail
    let duplicateError = null;
    try {
      await User.create({
        email: 'unique-test@example.com',
        password: 'password123',
        name: 'Another User',
      });
    } catch (error) {
      duplicateError = error;
    }
    
    // Check if it's a duplicate key error
    expect(duplicateError).not.toBeNull();
    expect(duplicateError.code).toBe(11000); // MongoDB duplicate key error code
    expect(duplicateError.message).toMatch(/duplicate key|E11000/);
  });

  it('should validate email format', async () => {
    const userData = {
      email: 'invalid-email',
      password: 'password123',
      name: 'Test User',
    };

    await expect(User.create(userData)).rejects.toThrow();
  });

  it('should require password with minimum length', async () => {
    const userData = {
      email: 'test@example.com',
      password: '12345', // Less than 6 characters
      name: 'Test User',
    };

    await expect(User.create(userData)).rejects.toThrow();
  });

  it('should lowercase email', async () => {
    const user = await User.create({
      email: 'TEST@EXAMPLE.COM',
      password: 'password123',
      name: 'Test User',
    });

    expect(user.email).toBe('test@example.com');
  });
});

