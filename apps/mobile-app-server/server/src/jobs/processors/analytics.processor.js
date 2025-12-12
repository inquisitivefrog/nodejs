const { Worker } = require('bullmq');
const { getBullMQRedisConnection } = require('../../config/redis');
const { QUEUE_NAMES } = require('../../config/queue');

/**
 * Analytics job processor
 * Processes analytics logging jobs (user actions, events, etc.)
 */
const createAnalyticsWorker = () => {
  const redis = getBullMQRedisConnection();
  if (!redis) {
    return null;
  }

  const worker = new Worker(
    QUEUE_NAMES.ANALYTICS,
    async (job) => {
      const { event, userId, metadata, timestamp } = job.data;

      console.log(`[ANALYTICS WORKER] Processing analytics job ${job.id}: ${event} for user ${userId}`);

      // Simulate analytics logging
      // In production, send to analytics service (Google Analytics, Mixpanel, etc.)
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Log analytics event (in production, this would send to analytics service)
      console.log(`[ANALYTICS WORKER] Event logged: ${event}`, metadata);

      return {
        success: true,
        event,
        userId,
        loggedAt: new Date().toISOString(),
      };
    },
    {
      connection: redis,
      concurrency: 20, // Process up to 20 analytics events concurrently
    }
  );

  worker.on('completed', (job) => {
    // Analytics jobs complete silently (no need to log every completion)
  });

  worker.on('failed', (job, err) => {
    console.error(`[ANALYTICS WORKER] Job ${job.id} failed:`, err.message);
  });

  return worker;
};

module.exports = {
  createAnalyticsWorker,
};

