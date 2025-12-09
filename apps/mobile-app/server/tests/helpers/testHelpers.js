const mongoose = require('mongoose');
const connectDB = require('../../src/config/database');
const User = require('../../src/models/User');

let connectionEstablished = false;

const setupTestDB = async () => {
  if (!connectionEstablished) {
    await connectDB();
    connectionEstablished = true;
  }
};

const clearDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await User.deleteMany({});
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

