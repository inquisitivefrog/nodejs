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
process.env.MONGODB_URI = isDocker 
  ? 'mongodb://mongodb:27017/mobileapp-test'
  : 'mongodb://localhost:27017/mobileapp-test';

// Log the database URI being used (without sensitive info) for debugging
console.log(`[TEST SETUP] Using database: ${process.env.MONGODB_URI}`);

// Close database connection after all tests
afterAll(async () => {
  try {
    // Close all mongoose connections
    if (mongoose.connection.readyState !== 0) {
      try {
        // Drop test database
        if (mongoose.connection.db) {
          await mongoose.connection.db.dropDatabase();
        }
      } catch (err) {
        // Ignore drop errors
      }
      
      // Close the connection
      await mongoose.connection.close();
    }
    
    // Close any other connections
    if (mongoose.connections && mongoose.connections.length > 0) {
      for (const conn of mongoose.connections) {
        if (conn.readyState !== 0) {
          try {
            await conn.close();
          } catch (err) {
            // Ignore close errors
          }
        }
      }
    }
    
    // Force disconnect all connections
    await mongoose.disconnect();
  } catch (error) {
    // Ignore errors during cleanup
    // Force disconnect as last resort
    try {
      await mongoose.disconnect();
    } catch (e) {
      // Ignore
    }
  }
}, 15000); // Increase timeout to 15 seconds

