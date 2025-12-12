// Mock ioredis before importing the module
jest.mock('ioredis');

describe('Redis Configuration', () => {
  let mockRedisInstance;
  let originalEnv;
  let originalRedisUrl;
  let Redis;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    originalRedisUrl = process.env.REDIS_URL;
    
    // Reset modules to get fresh Redis mock and redis config module
    jest.resetModules();
    
    // Re-import Redis mock after reset
    Redis = require('ioredis');
    
    // Create a fresh mock Redis instance for each test
    mockRedisInstance = {
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK'),
      status: 'ready',
    };
    
    // Clear previous mock calls and set new implementation
    Redis.mockClear();
    Redis.mockImplementation(() => mockRedisInstance);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalRedisUrl !== undefined) {
      process.env.REDIS_URL = originalRedisUrl;
    } else {
      delete process.env.REDIS_URL;
    }
  });

  describe('connectRedis', () => {
    it('should create Redis client with default URL', () => {
      delete process.env.REDIS_URL;
      const { connectRedis } = require('../../../src/config/redis');
      
      connectRedis();
      
      expect(Redis).toHaveBeenCalledWith('redis://redis:6379', expect.objectContaining({
        retryStrategy: expect.any(Function),
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        enableOfflineQueue: false,
      }));
    });

    it('should create Redis client with custom URL from environment', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      // Reset modules to pick up new env var
      jest.resetModules();
      Redis = require('ioredis');
      Redis.mockImplementation(() => mockRedisInstance);
      const { connectRedis } = require('../../../src/config/redis');
      
      connectRedis();
      
      expect(Redis).toHaveBeenCalledWith('redis://localhost:6379', expect.any(Object));
    });

    it('should set up event handlers', () => {
      const { connectRedis } = require('../../../src/config/redis');
      
      connectRedis();
      
      // Should set up event handlers
      expect(mockRedisInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should return existing client if already connected', () => {
      const { connectRedis } = require('../../../src/config/redis');
      
      const client1 = connectRedis();
      const client2 = connectRedis();
      
      // Should return the same instance
      expect(client1).toBe(client2);
      // Should only create one Redis instance
      expect(Redis).toHaveBeenCalledTimes(1);
    });

    it('should implement retry strategy', () => {
      const { connectRedis } = require('../../../src/config/redis');
      
      connectRedis();
      
      const retryStrategy = Redis.mock.calls[0][1].retryStrategy;
      
      // Test retry strategy with different attempt counts
      expect(retryStrategy(1)).toBe(50); // 1 * 50 = 50ms
      expect(retryStrategy(10)).toBe(500); // 10 * 50 = 500ms
      expect(retryStrategy(50)).toBe(2000); // Capped at 2000ms
    });
  });

  describe('getRedisClient', () => {
    it('should return existing client if ready', () => {
      // Temporarily set NODE_ENV to development to allow Redis connection in unit tests
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      jest.resetModules();
      Redis = require('ioredis');
      Redis.mockImplementation(() => mockRedisInstance);
      const { connectRedis, getRedisClient } = require('../../../src/config/redis');
      
      const client1 = connectRedis();
      const client2 = getRedisClient();
      
      expect(client1).toBe(client2);
      
      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });

    it('should create new client if not ready', () => {
      // Temporarily set NODE_ENV to development to allow Redis connection in unit tests
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // Reset modules to ensure no existing client
      jest.resetModules();
      Redis = require('ioredis');
      mockRedisInstance.status = 'end';
      Redis.mockImplementation(() => mockRedisInstance);
      const { getRedisClient } = require('../../../src/config/redis');
      
      const client = getRedisClient();
      
      expect(client).toBe(mockRedisInstance);
      expect(Redis).toHaveBeenCalled();
      
      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('disconnectRedis', () => {
    it('should disconnect Redis client', async () => {
      const { connectRedis, disconnectRedis } = require('../../../src/config/redis');
      
      connectRedis();
      await disconnectRedis();
      
      expect(mockRedisInstance.quit).toHaveBeenCalled();
    });

    it('should handle disconnect when client is null', async () => {
      // Reset modules to ensure no existing client
      jest.resetModules();
      const { disconnectRedis } = require('../../../src/config/redis');
      
      // Should not throw when no client exists
      await expect(disconnectRedis()).resolves.not.toThrow();
    });
  });
});

