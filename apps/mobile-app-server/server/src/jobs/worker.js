require('dotenv').config();
const connectDB = require('../config/database');
const { connectRedis, getBullMQRedisConnection } = require('../config/redis');
const {
  createEmailWorker,
} = require('./processors/email.processor');
const {
  createNotificationWorker,
} = require('./processors/notification.processor');
const {
  createAnalyticsWorker,
} = require('./processors/analytics.processor');
const {
  createImageProcessingWorker,
} = require('./processors/image.processor');

// Connect to databases
connectDB();
connectRedis();

// Initialize BullMQ Redis connection (required before creating workers)
getBullMQRedisConnection();

// Create all workers
const workers = [];

console.log('🚀 Starting job queue workers...');

// Email worker
const emailWorker = createEmailWorker();
if (emailWorker) {
  workers.push(emailWorker);
  console.log('✓ Email worker started');
}

// Notification worker
const notificationWorker = createNotificationWorker();
if (notificationWorker) {
  workers.push(notificationWorker);
  console.log('✓ Notification worker started');
}

// Analytics worker
const analyticsWorker = createAnalyticsWorker();
if (analyticsWorker) {
  workers.push(analyticsWorker);
  console.log('✓ Analytics worker started');
}

// Image processing worker
const imageWorker = createImageProcessingWorker();
if (imageWorker) {
  workers.push(imageWorker);
  console.log('✓ Image processing worker started');
}

console.log(`✅ All workers started (${workers.length} active)`);

// Graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Shutting down workers...');
  
  await Promise.all(
    workers.map(async (worker) => {
      try {
        await worker.close();
      } catch (err) {
        console.error('Error closing worker:', err.message);
      }
    })
  );

  console.log('✅ All workers stopped');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

