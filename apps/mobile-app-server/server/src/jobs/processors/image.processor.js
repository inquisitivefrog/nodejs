const { Worker } = require('bullmq');
const { getBullMQRedisConnection } = require('../../config/redis');
const { QUEUE_NAMES } = require('../../config/queue');

/**
 * Image processing job processor
 * Processes image uploads (resizing, optimization, thumbnail generation)
 */
const createImageProcessingWorker = () => {
  const redis = getBullMQRedisConnection();
  if (!redis) {
    return null;
  }

  const worker = new Worker(
    QUEUE_NAMES.IMAGE_PROCESSING,
    async (job) => {
      const { imagePath, userId, operations } = job.data;

      console.log(`[IMAGE WORKER] Processing image job ${job.id}: ${imagePath} for user ${userId}`);

      // Simulate image processing
      // In production, use sharp, jimp, or similar library for image processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Log image processing details
      const processedImages = operations?.map((op) => ({
        operation: op.type,
        path: `${imagePath}_${op.type}`,
      })) || [];

      console.log(`[IMAGE WORKER] Image processed: ${imagePath} - ${processedImages.length} variants created`);

      return {
        success: true,
        originalPath: imagePath,
        processedImages,
        processedAt: new Date().toISOString(),
      };
    },
    {
      connection: redis,
      concurrency: 3, // Process up to 3 images concurrently (CPU intensive)
    }
  );

  worker.on('completed', (job) => {
    console.log(`[IMAGE WORKER] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[IMAGE WORKER] Job ${job.id} failed:`, err.message);
  });

  return worker;
};

module.exports = {
  createImageProcessingWorker,
};

