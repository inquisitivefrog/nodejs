const { Worker } = require('bullmq');
const { getBullMQRedisConnection } = require('../../config/redis');
const { QUEUE_NAMES } = require('../../config/queue');

/**
 * Push notification job processor
 * Processes push notification jobs (FCM, APNS, etc.)
 */
const createNotificationWorker = () => {
  const redis = getBullMQRedisConnection();
  if (!redis) {
    return null;
  }

  const worker = new Worker(
    QUEUE_NAMES.NOTIFICATION,
    async (job) => {
      const { userId, title, body, data, deviceTokens } = job.data;

      console.log(`[NOTIFICATION WORKER] Processing notification job ${job.id}: ${title} to user ${userId}`);

      // Simulate push notification sending
      // In production, integrate with FCM, APNS, etc.
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Log notification details (in production, this would send actual push notifications)
      console.log(`[NOTIFICATION WORKER] Notification sent: ${title} to ${deviceTokens?.length || 0} devices`);

      return {
        success: true,
        userId,
        title,
        sentAt: new Date().toISOString(),
        devicesNotified: deviceTokens?.length || 0,
      };
    },
    {
      connection: redis,
      concurrency: 10, // Process up to 10 notifications concurrently
    }
  );

  worker.on('completed', (job) => {
    console.log(`[NOTIFICATION WORKER] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[NOTIFICATION WORKER] Job ${job.id} failed:`, err.message);
  });

  return worker;
};

module.exports = {
  createNotificationWorker,
};

