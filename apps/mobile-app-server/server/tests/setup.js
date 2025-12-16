// Skip setup for isolated unit tests that use mocks only
// This must be checked FIRST before any other code runs
if (process.env.SKIP_DB_SETUP === 'true' || process.env.SKIP_DB_SETUP === '1') {
  // Minimal setup for isolated tests
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.JWT_EXPIRES_IN = '1h';
  // Export empty object - no database setup needed
  module.exports = {};
} else {
  // Normal setup with database connections
  const mongoose = require('mongoose');

  // Set test environment variables BEFORE any other imports
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.JWT_EXPIRES_IN = '1h';

  // Force test database URI - ALWAYS override any existing MONGODB_URI for tests
  // In Docker, use service name; locally, use localhost
  // Check if we're in Docker by looking at the hostname or if mongodb service is available
  const isDocker = process.env.HOSTNAME || process.env.DOCKER_ENV;
  // ALWAYS use test database for tests, regardless of what's in environment
  // For tests, we can connect to a single node (mongodb1) - replica set not required for testing
  process.env.MONGODB_URI = isDocker 
    ? 'mongodb://mongodb1:27017/mobileapp-test'
    : 'mongodb://localhost:27017/mobileapp-test';

  // Log the database URI being used (without sensitive info) for debugging
  console.log(`[TEST SETUP] Using database: ${process.env.MONGODB_URI}`);

  // Close database and Redis connections after all tests
  afterAll(async () => {
    try {
      // Close queue connections first (BullMQ)
      try {
        const { closeQueues } = require('../src/config/queue');
        await closeQueues();
        // Give queues time to close gracefully
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (err) {
        // Ignore queue close errors (may not be initialized in tests)
      }

      // Close database pool connections (read/write pools)
      try {
        const { closePools } = require('../src/config/database-pools');
        await closePools();
        // Give pools time to close gracefully
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (err) {
        // Ignore pool close errors (may not be initialized in tests)
      }

      // Close Redis connection if it exists
      try {
        const { disconnectRedis } = require('../src/config/redis');
        await disconnectRedis();
        // Give Redis time to close gracefully
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        // Ignore Redis disconnect errors (may not be connected in tests)
      }

      // Close all mongoose connections properly
      // This is critical for Jest to exit cleanly without --forceExit
      
      // First, close all individual connections
      if (mongoose.connections && mongoose.connections.length > 0) {
        await Promise.all(
          mongoose.connections.map(async (conn) => {
            if (conn.readyState !== 0) {
              try {
                // Close the connection
                await conn.close();
              } catch (err) {
                // Ignore individual connection close errors
              }
            }
          })
        );
      }
      
      // Close the default connection
      if (mongoose.connection.readyState !== 0) {
        try {
          // Drop test database (optional cleanup)
          if (mongoose.connection.db) {
            try {
              await mongoose.connection.db.dropDatabase();
            } catch (err) {
              // Ignore drop errors - database might already be dropped
            }
          }
          
          // Close the connection
          await mongoose.connection.close();
        } catch (err) {
          // Ignore close errors
        }
      }
      
      // Force disconnect all connections - this ensures all connections are closed
      // This is the equivalent of knex.destroy() for Mongoose
      await mongoose.disconnect();
      
      // Give a small delay to ensure all cleanup is complete
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      // Ignore errors during cleanup, but ensure we still disconnect
      try {
        await mongoose.disconnect();
      } catch (e) {
        // Final fallback - ignore all errors
      }
    }
  }, 20000); // Increase timeout to 20 seconds for complete cleanup
}
