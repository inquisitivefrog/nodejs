const mongoose = require('mongoose');

const connectDB = async () => {
  // If already connected, verify it's the right database
  if (mongoose.connection.readyState === 1) {
    // In test mode, verify we're using test database
    if (process.env.NODE_ENV === 'test') {
      const dbName = mongoose.connection.db?.databaseName;
      if (dbName && !dbName.includes('test')) {
        console.warn(`[WARNING] Test environment but connected to non-test database: ${dbName}`);
      }
    }
    return;
  }

  const maxRetries = 5;
  let retries = 0;
  const mongoUri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/mobileapp';

  while (retries < maxRetries) {
    try {
      const conn = await mongoose.connect(mongoUri);

      console.log(`MongoDB Connected: ${conn.connection.host}`);
      // Log database name in test mode
      if (process.env.NODE_ENV === 'test') {
        console.log(`[TEST] Connected to database: ${conn.connection.db.databaseName}`);
      }
      return;
    } catch (error) {
      retries++;
      console.error(`MongoDB connection error (attempt ${retries}/${maxRetries}): ${error.message}`);
      
      if (retries < maxRetries) {
        console.log('Retrying in 5 seconds...');
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        console.error('Failed to connect to MongoDB after multiple attempts');
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;

