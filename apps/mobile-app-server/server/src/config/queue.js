// Lazy load BullMQ to avoid crashes if not installed
let Queue, Worker, QueueEvents;
try {
  const bullmq = require('bullmq');
  Queue = bullmq.Queue;
  Worker = bullmq.Worker;
  QueueEvents = bullmq.QueueEvents;
} catch (err) {
  console.warn('[QUEUE] BullMQ not available:', err.message);
  // Create dummy classes for test mode
  Queue = class {};
  Worker = class {};
  QueueEvents = class {};
}

const { getBullMQRedisConnection } = require('./redis');

// Job queue names
const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  ANALYTICS: 'analytics',
  IMAGE_PROCESSING: 'image-processing',
};

// Create queue instances
const createQueue = (queueName) => {
  // In test mode, return null to skip queue operations
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  const redis = getBullMQRedisConnection();
  if (!redis) {
    console.warn(`[QUEUE] Redis not available, queue ${queueName} will not work`);
    return null;
  }

  return new Queue(queueName, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000, // Keep max 1000 completed jobs
      },
      removeOnFail: {
        age: 24 * 3600, // Keep failed jobs for 24 hours
      },
    },
  });
};

// Get or create queue instances
const queues = {};

const getQueue = (queueName) => {
  if (!queues[queueName]) {
    queues[queueName] = createQueue(queueName);
  }
  return queues[queueName];
};

// Helper to enqueue a job safely (handles test mode and Redis unavailability)
const enqueueJob = async (queueName, jobData, options = {}) => {
  const queue = getQueue(queueName);
  
  if (!queue) {
    // In test mode or if Redis unavailable, log and return
    if (process.env.NODE_ENV === 'development') {
      console.log(`[QUEUE] Skipping job enqueue for ${queueName} (test mode or Redis unavailable)`);
    }
    return null;
  }

  try {
    const job = await queue.add(queueName, jobData, options);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[QUEUE] Job enqueued: ${queueName} - Job ID: ${job.id}`);
    }
    return job;
  } catch (error) {
    console.error(`[QUEUE] Error enqueueing job ${queueName}:`, error.message);
    throw error;
  }
};

// Close all queues
const closeQueues = async () => {
  await Promise.all(
    Object.values(queues).map(async (queue) => {
      if (queue) {
        try {
          await queue.close();
        } catch (err) {
          // Ignore errors during cleanup
        }
      }
    })
  );
  // Clear queue references
  Object.keys(queues).forEach((key) => delete queues[key]);
};

module.exports = {
  QUEUE_NAMES,
  getQueue,
  enqueueJob,
  closeQueues,
  Queue,
  Worker,
  QueueEvents,
};

