const mongoose = require('mongoose');

const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const conn = await mongoose.connect(
        process.env.MONGODB_URI || 'mongodb://mongodb:27017/mobileapp'
      );

      console.log(`MongoDB Connected: ${conn.connection.host}`);
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

