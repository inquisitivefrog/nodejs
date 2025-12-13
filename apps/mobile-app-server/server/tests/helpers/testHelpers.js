const mongoose = require('mongoose');
const connectDB = require('../../src/config/database');
const User = require('../../src/models/User');

let connectionEstablished = false;

const setupTestDB = async () => {
  // ALWAYS ensure we're using test database - override any existing MONGODB_URI
  const isDocker = process.env.HOSTNAME || process.env.DOCKER_ENV;
  // For tests, we can connect to a single node (mongodb1) - replica set not required for testing
  process.env.MONGODB_URI = isDocker 
    ? 'mongodb://mongodb1:27017/mobileapp-test'
    : 'mongodb://localhost:27017/mobileapp-test';
  
  if (!connectionEstablished) {
    await connectDB();
    connectionEstablished = true;
  }
  // Ensure connection is ready
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('connected', resolve);
      }
    });
  }
  // Verify we're connected to the test database
  const dbName = mongoose.connection.db?.databaseName;
  if (dbName && dbName !== 'mobileapp-test') {
    throw new Error(`Expected test database 'mobileapp-test' but connected to: ${dbName}. MONGODB_URI: ${process.env.MONGODB_URI}`);
  }
};

const clearDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    try {
      await User.deleteMany({});
      // Also clear DeviceToken if it exists
      const DeviceToken = require('../../src/models/DeviceToken');
      await DeviceToken.deleteMany({});
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
};

const createTestUser = async (userData = {}) => {
  const defaultUser = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    role: 'user',
    ...userData,
  };
  return await User.create(defaultUser);
};

const createTestAdmin = async (adminData = {}) => {
  const defaultAdmin = {
    email: 'admin@test.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    ...adminData,
  };
  return await User.create(defaultAdmin);
};

module.exports = {
  setupTestDB,
  clearDatabase,
  createTestUser,
  createTestAdmin,
};

