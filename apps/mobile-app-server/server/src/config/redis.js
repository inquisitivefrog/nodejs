const Redis = require('ioredis');

let redisClient = null;

const connectRedis = () => {
  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
  
  redisClient = new Redis(redisUrl, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: false,
  });

  redisClient.on('connect', () => {
    console.log('Redis Connected');
  });

  redisClient.on('ready', () => {
    console.log('Redis Ready');
  });

  redisClient.on('error', (err) => {
    // Only log errors in development, not in test or production
    if (process.env.NODE_ENV === 'development') {
      console.error('Redis connection error:', err.message);
    }
  });

  redisClient.on('close', () => {
    console.log('Redis connection closed');
  });

  return redisClient;
};

const getRedisClient = () => {
  // Don't create Redis connections in test environment
  if (process.env.NODE_ENV === 'test') {
    return null;
  }
  
  if (!redisClient || redisClient.status !== 'ready') {
    return connectRedis();
  }
  return redisClient;
};

/**
 * Get Redis connection for BullMQ
 * BullMQ requires maxRetriesPerRequest: null for blocking commands
 */
let bullmqRedisClient = null;

const getBullMQRedisConnection = () => {
  // Don't create Redis connections in test environment
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  if (bullmqRedisClient && bullmqRedisClient.status === 'ready') {
    return bullmqRedisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
  
  // Create a separate Redis connection for BullMQ with required options
  bullmqRedisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required by BullMQ for blocking commands
    enableReadyCheck: true,
    enableOfflineQueue: false,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  bullmqRedisClient.on('connect', () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('BullMQ Redis Connected');
    }
  });

  bullmqRedisClient.on('ready', () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('BullMQ Redis Ready');
    }
  });

  bullmqRedisClient.on('error', (err) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('BullMQ Redis connection error:', err.message);
    }
  });

  bullmqRedisClient.on('close', () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('BullMQ Redis connection closed');
    }
  });

  return bullmqRedisClient;
};

const disconnectRedis = async () => {
  if (redisClient) {
    try {
      // Check if client is still connected before trying to quit
      const status = redisClient.status;
      if (status === 'ready' || status === 'connecting') {
        // Gracefully quit if connected
        await redisClient.quit();
      } else if (status !== 'end' && status !== 'close') {
        // Force disconnect if not already closed
        redisClient.disconnect(false); // false = don't reconnect
      }
    } catch (err) {
      // If quit fails, try disconnect
      try {
        redisClient.disconnect(false);
      } catch (e) {
        // Ignore disconnect errors
      }
    } finally {
      redisClient = null;
    }
  }
};

const disconnectBullMQRedis = async () => {
  if (bullmqRedisClient) {
    try {
      const status = bullmqRedisClient.status;
      if (status === 'ready' || status === 'connecting') {
        await bullmqRedisClient.quit();
      } else if (status !== 'end' && status !== 'close') {
        bullmqRedisClient.disconnect(false);
      }
    } catch (err) {
      try {
        bullmqRedisClient.disconnect(false);
      } catch (e) {
        // Ignore disconnect errors
      }
    } finally {
      bullmqRedisClient = null;
    }
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis,
  getBullMQRedisConnection,
  disconnectBullMQRedis,
};

