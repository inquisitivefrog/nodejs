const { getReadConnection, getWriteConnection } = require('../config/database-pools');
const { getUserModel } = require('../models/User');

/**
 * Get User model for read operations (uses read pool - secondaryPreferred)
 */
const getReadUserModel = async () => {
  try {
    const readConn = await getReadConnection();
    return getUserModel(readConn);
  } catch (error) {
    // Fallback to default connection if read pool unavailable
    console.warn('[DB HELPER] Read pool unavailable, using default connection:', error.message);
    const User = require('../models/User');
    return User;
  }
};

/**
 * Get User model for write operations (uses write pool - primary)
 */
const getWriteUserModel = async () => {
  try {
    const writeConn = await getWriteConnection();
    return getUserModel(writeConn);
  } catch (error) {
    // Fallback to default connection if write pool unavailable
    console.warn('[DB HELPER] Write pool unavailable, using default connection:', error.message);
    const User = require('../models/User');
    return User;
  }
};

module.exports = {
  getReadUserModel,
  getWriteUserModel,
};




