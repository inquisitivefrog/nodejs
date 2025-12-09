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
    await new Promise((resolve) => setTimeout(resolve, 100));
  } catch (error) {
    // Ignore errors during cleanup, but ensure we still disconnect
    try {
      await mongoose.disconnect();
    } catch (e) {
      // Final fallback - ignore all errors
    }
  }
}, 15000); // Increase timeout to 15 seconds

