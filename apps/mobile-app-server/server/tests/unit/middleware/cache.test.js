const { cache, invalidateCache, clearCache } = require('../../../src/middleware/cache');
const { getRedisClient } = require('../../../src/config/redis');

// Mock Redis client
jest.mock('../../../src/config/redis', () => {
  const mockRedis = {
    get: jest.fn(),
    setex: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
    status: 'ready',
  };
  
  return {
    getRedisClient: jest.fn(() => mockRedis),
    connectRedis: jest.fn(() => mockRedis),
    disconnectRedis: jest.fn(),
  };
});

describe('Cache Middleware', () => {
  let req, res, next;
  let mockRedis;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get the mocked Redis client
    mockRedis = getRedisClient();
    
    // Setup request/response mocks
    req = {
      method: 'GET',
      originalUrl: '/api/users',
      url: '/api/users',
    };
    
    res = {
      json: jest.fn(function(data) {
        this.body = data;
        return this;
      }),
      setHeader: jest.fn(),
    };
    
    next = jest.fn();
  });

  describe('cache middleware', () => {
    it('should skip caching in test environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      
      const middleware = cache();
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(mockRedis.get).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should skip caching for non-GET requests', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      req.method = 'POST';
      const middleware = cache();
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(mockRedis.get).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should return cached response on cache hit', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const cachedData = { users: [{ id: '1', name: 'Test' }] };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));
      
      const middleware = cache();
      await middleware(req, res, next);
      
      expect(mockRedis.get).toHaveBeenCalledWith('cache:/api/users');
      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(res.json).toHaveBeenCalledWith(cachedData);
      expect(next).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should cache response on cache miss', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      
      const responseData = { users: [{ id: '1', name: 'Test' }] };
      
      const middleware = cache(300); // 5 minutes TTL
      await middleware(req, res, next);
      
      // Should call next to continue to route handler
      expect(next).toHaveBeenCalled();
      expect(mockRedis.get).toHaveBeenCalledWith('cache:/api/users');
      
      // Simulate route handler calling res.json
      res.json(responseData);
      
      // Wait a bit for async setex
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'cache:/api/users',
        300,
        JSON.stringify(responseData)
      );
      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should use custom cache key generator', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const customKeyGen = (req) => `custom:${req.url}`;
      mockRedis.get.mockResolvedValue(null);
      
      const middleware = cache(300, customKeyGen);
      await middleware(req, res, next);
      
      expect(mockRedis.get).toHaveBeenCalledWith('custom:/api/users');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should continue without caching if Redis fails', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      
      const middleware = cache();
      await middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache by pattern', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const keys = ['cache:/api/users/1', 'cache:/api/users/2'];
      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.del.mockResolvedValue(2);
      
      await invalidateCache('cache:/api/users/*');
      
      expect(mockRedis.keys).toHaveBeenCalledWith('cache:/api/users/*');
      expect(mockRedis.del).toHaveBeenCalledWith(...keys);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle no matching keys', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      mockRedis.keys.mockResolvedValue([]);
      
      await invalidateCache('cache:/api/users/*');
      
      expect(mockRedis.keys).toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle Redis errors gracefully', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));
      
      // Should not throw
      await expect(invalidateCache('cache:/api/users/*')).resolves.not.toThrow();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('clearCache', () => {
    it('should clear all cache keys', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const keys = ['cache:/api/users', 'cache:/api/users/1', 'cache:/api/auth/me'];
      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.del.mockResolvedValue(3);
      
      await clearCache();
      
      expect(mockRedis.keys).toHaveBeenCalledWith('cache:*');
      expect(mockRedis.del).toHaveBeenCalledWith(...keys);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle no cache keys', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      mockRedis.keys.mockResolvedValue([]);
      
      await clearCache();
      
      expect(mockRedis.keys).toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle Redis errors gracefully', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));
      
      // Should not throw
      await expect(clearCache()).resolves.not.toThrow();
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});





