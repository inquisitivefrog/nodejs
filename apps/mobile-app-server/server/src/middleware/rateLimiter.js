const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');

/**
 * No-op middleware for test environment (rate limiting disabled in tests)
 */
const noOpRateLimiter = (req, res, next) => next();

/**
 * Create a rate limiter with Redis store (if available) or memory store
 */
function createRateLimiter(options = {}) {
  // Disable rate limiting in test environment
  if (process.env.NODE_ENV === 'test') {
    return noOpRateLimiter;
  }

  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    standardHeaders = true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders = false, // Disable the `X-RateLimit-*` headers
  } = options;

  // Try to use Redis store if available, otherwise use memory store
  let store;
  try {
    const redisClient = getRedisClient();
    if (redisClient && (redisClient.status === 'ready' || redisClient.status === 'connect')) {
      // Use Redis store for distributed rate limiting across multiple server instances
      // rate-limit-redis v4 exports a RedisStore class
      const { RedisStore } = require('rate-limit-redis');
      store = new RedisStore({
        client: redisClient,
        prefix: 'rl:', // Redis key prefix
      });
    }
  } catch (error) {
    // Redis not available, use memory store (default)
    // This is fine for single-instance deployments
    if (process.env.NODE_ENV === 'development') {
      console.log('[RATE LIMITER] Using memory store (Redis not available):', error.message);
    }
  }

  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000), // seconds
    },
    standardHeaders,
    legacyHeaders,
    skipSuccessfulRequests,
    skipFailedRequests,
    store,
    // Custom key generator for user-based rate limiting
    keyGenerator: (req) => {
      // If user is authenticated, use user ID for rate limiting
      // Otherwise, use IP address
      return req.user?.id ? `user:${req.user.id}` : req.ip;
    },
    // Custom handler for rate limit exceeded
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        limit: max,
        window: Math.ceil(windowMs / 1000),
      });
    },
  });
}

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP/user
 */
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many API requests, please try again later.',
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP (prevents brute force)
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Very strict for auth endpoints
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful logins
  skipFailedRequests: false, // Count failed attempts
});

/**
 * Moderate rate limiter for password reset
 * 3 requests per hour per IP
 */
const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset requests, please try again later.',
});

/**
 * Rate limiter for user-based operations
 * 200 requests per 15 minutes per authenticated user
 */
const userLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: 'Too many requests, please try again later.',
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  userLimiter,
  createRateLimiter,
};

