const { getRedisClient } = require('../config/redis');

/**
 * Cache middleware for Express routes
 * Caches GET request responses in Redis
 * 
 * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
 * @param {function} keyGenerator - Optional function to generate cache key from request
 */
const cache = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    try {
      const redis = getRedisClient();
      
      // If Redis is not available (e.g., in test mode), skip caching
      if (!redis) {
        return next();
      }
      
      // Generate cache key
      const cacheKey = keyGenerator 
        ? keyGenerator(req)
        : `cache:${req.originalUrl || req.url}`;

      // Try to get from cache
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        // Cache hit - return cached response
        const data = JSON.parse(cached);
        res.setHeader('X-Cache', 'HIT');
        return res.json(data);
      }

      // Cache miss - store original json method
      const originalJson = res.json.bind(res);
      
      // Override res.json to cache the response
      res.json = function (data) {
        // Cache the response (async, don't wait)
        redis.setex(cacheKey, ttl, JSON.stringify(data)).catch((err) => {
          // Only log in development
          if (process.env.NODE_ENV === 'development') {
            console.error('Redis cache set error:', err.message);
          }
        });
        
        res.setHeader('X-Cache', 'MISS');
        return originalJson(data);
      };

      next();
    } catch (error) {
      // If Redis fails, continue without caching
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Redis cache error:', error.message);
      }
      next();
    }
  };
};

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Redis key pattern (e.g., 'cache:/api/users/*')
 */
const invalidateCache = async (pattern) => {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return; // Skip if Redis not available (e.g., in test mode)
    }
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Cache invalidated: ${keys.length} keys matching pattern "${pattern}"`);
    }
  } catch (error) {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Cache invalidation error:', error.message);
    }
  }
};

/**
 * Clear all cache
 */
const clearCache = async () => {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return; // Skip if Redis not available (e.g., in test mode)
    }
    const keys = await redis.keys('cache:*');
    
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Cache cleared: ${keys.length} keys`);
    }
  } catch (error) {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Cache clear error:', error.message);
    }
  }
};

module.exports = {
  cache,
  invalidateCache,
  clearCache,
};

