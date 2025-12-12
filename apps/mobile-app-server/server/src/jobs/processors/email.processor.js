const { Worker } = require('bullmq');
const { getBullMQRedisConnection } = require('../../config/redis');
const { QUEUE_NAMES } = require('../../config/queue');

/**
 * Email job processor
 * Processes email sending jobs (welcome emails, password resets, etc.)
 */
const createEmailWorker = () => {
  const redis = getBullMQRedisConnection();
  if (!redis) {
    return null;
  }

  const worker = new Worker(
    QUEUE_NAMES.EMAIL,
    async (job) => {
      const { to, subject, template, data } = job.data;

      console.log(`[EMAIL WORKER] Processing email job ${job.id}: ${subject} to ${to}`);

      // Simulate email sending (replace with actual email service integration)
      // In production, integrate with SendGrid, AWS SES, etc.
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Log email details (in production, this would send the actual email)
      console.log(`[EMAIL WORKER] Email sent: ${subject} to ${to}`);

      return {
        success: true,
        to,
        subject,
        sentAt: new Date().toISOString(),
      };
    },
    {
      connection: redis,
      concurrency: 5, // Process up to 5 emails concurrently
    }
  );

  worker.on('completed', (job) => {
    console.log(`[EMAIL WORKER] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[EMAIL WORKER] Job ${job.id} failed:`, err.message);
  });

  return worker;
};

module.exports = {
  createEmailWorker,
};

