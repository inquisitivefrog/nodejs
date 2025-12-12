const mongoose = require('mongoose');

// Separate connection pools for read and write operations
let readConnection = null;
let writeConnection = null;

/**
 * Get or create read connection pool
 * Uses secondaryPreferred for read operations
 */
const getReadConnection = async () => {
  if (readConnection && readConnection.readyState === 1) {
    return readConnection;
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://mongodb1:27017,mongodb2:27017,mongodb3:27017/mobileapp?replicaSet=rs0';
  
  // Read connection options - optimized for read operations
  const readOptions = {
    // Connection pool settings for reads
    maxPoolSize: parseInt(process.env.MONGODB_READ_POOL_SIZE) || 15, // Larger pool for reads
    minPoolSize: parseInt(process.env.MONGODB_READ_MIN_POOL_SIZE) || 3,
    maxIdleTimeMS: 30000,
    
    // Read preference: prefer secondary nodes
    readPreference: process.env.NODE_ENV === 'test' ? 'primary' : 'secondaryPreferred',
    
    // Read concern for consistency
    readConcern: { level: 'majority' },
    
    // Server selection timeout
    serverSelectionTimeoutMS: 5000,
    
    // Socket timeout
    socketTimeoutMS: 45000,
    
    // Heartbeat frequency
    heartbeatFrequencyMS: 10000,
  };

  try {
    // Create a separate connection for reads
    readConnection = await mongoose.createConnection(mongoUri, {
      ...readOptions,
      // Use a different connection name for tracking
      appName: 'mobile-app-read-pool',
    });

    readConnection.on('connected', () => {
      console.log('[READ POOL] MongoDB Read Connection Established');
      console.log(`[READ POOL] Read Preference: ${readOptions.readPreference}`);
      console.log(`[READ POOL] Pool Size: min=${readOptions.minPoolSize}, max=${readOptions.maxPoolSize}`);
    });

    readConnection.on('error', (err) => {
      console.error('[READ POOL] Connection error:', err.message);
    });

    return readConnection;
  } catch (error) {
    console.error('[READ POOL] Failed to create read connection:', error.message);
    throw error;
  }
};

/**
 * Get or create write connection pool
 * Uses primary for write operations
 */
const getWriteConnection = async () => {
  if (writeConnection && writeConnection.readyState === 1) {
    return writeConnection;
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://mongodb1:27017,mongodb2:27017,mongodb3:27017/mobileapp?replicaSet=rs0';
  
  // Write connection options - optimized for write operations
  const writeOptions = {
    // Connection pool settings for writes
    maxPoolSize: parseInt(process.env.MONGODB_WRITE_POOL_SIZE) || 10, // Smaller pool for writes
    minPoolSize: parseInt(process.env.MONGODB_WRITE_MIN_POOL_SIZE) || 2,
    maxIdleTimeMS: 30000,
    
    // Read preference: always use primary for writes
    readPreference: 'primary',
    
    // Write concern: ensure writes are acknowledged by majority
    w: 'majority',
    wtimeoutMS: 5000,
    
    // Journal write concern for durability
    journal: true, // Journal writes for durability
    
    // Server selection timeout
    serverSelectionTimeoutMS: 5000,
    
    // Socket timeout
    socketTimeoutMS: 45000,
    
    // Heartbeat frequency
    heartbeatFrequencyMS: 10000,
  };

  try {
    // Create a separate connection for writes
    writeConnection = await mongoose.createConnection(mongoUri, {
      ...writeOptions,
      // Use a different connection name for tracking
      appName: 'mobile-app-write-pool',
    });

    writeConnection.on('connected', () => {
      console.log('[WRITE POOL] MongoDB Write Connection Established');
      console.log(`[WRITE POOL] Write Concern: w=${writeOptions.w}, journal=${writeOptions.journal}`);
      console.log(`[WRITE POOL] Pool Size: min=${writeOptions.minPoolSize}, max=${writeOptions.maxPoolSize}`);
    });

    writeConnection.on('error', (err) => {
      console.error('[WRITE POOL] Connection error:', err.message);
    });

    return writeConnection;
  } catch (error) {
    console.error('[WRITE POOL] Failed to create write connection:', error.message);
    throw error;
  }
};

/**
 * Get connection pool statistics
 */
const getPoolStats = () => {
  const stats = {
    read: null,
    write: null,
  };

  if (readConnection) {
    stats.read = {
      readyState: readConnection.readyState,
      host: readConnection.host || readConnection.client?.s?.options?.hosts?.[0] || undefined,
      name: readConnection.name,
      // Note: Mongoose doesn't expose pool stats directly, but we can check connection state
    };
  }

  if (writeConnection) {
    stats.write = {
      readyState: writeConnection.readyState,
      host: writeConnection.host || writeConnection.client?.s?.options?.hosts?.[0] || undefined,
      name: writeConnection.name,
    };
  }

  return stats;
};

/**
 * Close all connection pools
 */
const closePools = async () => {
  const promises = [];
  
  if (readConnection && readConnection.readyState !== 0) {
    promises.push(readConnection.close());
  }
  
  if (writeConnection && writeConnection.readyState !== 0) {
    promises.push(writeConnection.close());
  }

  await Promise.all(promises);
  
  readConnection = null;
  writeConnection = null;
};

/**
 * Reset connection pools (for testing)
 * This clears the internal state without closing connections
 */
const resetPools = () => {
  readConnection = null;
  writeConnection = null;
};

module.exports = {
  getReadConnection,
  getWriteConnection,
  getPoolStats,
  closePools,
  resetPools, // Export for testing
};

