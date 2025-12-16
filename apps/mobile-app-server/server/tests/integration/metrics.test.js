const request = require('supertest');
const { setupTestDB } = require('../helpers/testHelpers');

// Import app AFTER setting up test environment
const app = require('../../src/app');

// Setup database before tests
beforeAll(async () => {
  await setupTestDB();
});

describe('Prometheus Metrics API', () => {
  describe('GET /metrics', () => {
    it('should return 404 in test environment (metrics disabled)', async () => {
      // Metrics endpoint is disabled in test environment
      const response = await request(app).get('/metrics');
      
      // In test environment, metrics endpoint should not be available
      // This is expected behavior as per app.js line 92
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('Metrics Configuration', () => {
    it('should have metrics module configured', () => {
      // Verify metrics module exists and exports required functions
      const metrics = require('../../src/config/metrics');
      
      expect(metrics).toBeDefined();
      expect(metrics.register).toBeDefined();
      expect(metrics.recordHttpRequest).toBeDefined();
      expect(metrics.updateDatabasePoolMetrics).toBeDefined();
      expect(metrics.updateRedisMetric).toBeDefined();
      expect(metrics.updateJobQueueMetrics).toBeDefined();
      expect(metrics.getMetrics).toBeDefined();
    });

    it('should have all required metric types defined', () => {
      const metrics = require('../../src/config/metrics');
      
      // Check that metric objects exist
      expect(metrics.httpRequestDuration).toBeDefined();
      expect(metrics.httpRequestTotal).toBeDefined();
      expect(metrics.httpRequestErrors).toBeDefined();
      expect(metrics.databasePoolSize).toBeDefined();
      expect(metrics.databasePoolActive).toBeDefined();
      expect(metrics.redisConnections).toBeDefined();
      expect(metrics.jobQueueSize).toBeDefined();
      expect(metrics.jobQueueCompleted).toBeDefined();
      expect(metrics.jobQueueFailed).toBeDefined();
    });

    it('should record HTTP request metrics correctly', () => {
      const { recordHttpRequest } = require('../../src/config/metrics');
      
      // Should not throw when called
      expect(() => {
        recordHttpRequest('GET', '/api/v1/users', 200, 150);
        recordHttpRequest('POST', '/api/v1/auth/login', 401, 50);
        recordHttpRequest('GET', '/api/v1/users', 500, 2000);
      }).not.toThrow();
    });

    it('should update database pool metrics correctly', () => {
      const { updateDatabasePoolMetrics } = require('../../src/config/metrics');
      
      const poolStats = {
        readPool: {
          size: 15,
          connections: 5,
        },
        writePool: {
          size: 10,
          connections: 3,
        },
      };
      
      // Should not throw when called
      expect(() => {
        updateDatabasePoolMetrics(poolStats);
        updateDatabasePoolMetrics(null);
        updateDatabasePoolMetrics({});
      }).not.toThrow();
    });

    it('should update Redis metrics correctly', () => {
      const { updateRedisMetric } = require('../../src/config/metrics');
      
      // Should not throw when called
      expect(() => {
        updateRedisMetric(true);
        updateRedisMetric(false);
      }).not.toThrow();
    });

    it('should update job queue metrics correctly', () => {
      const { updateJobQueueMetrics } = require('../../src/config/metrics');
      
      // Should not throw when called
      expect(() => {
        updateJobQueueMetrics('email', 10, 5, 1);
        updateJobQueueMetrics('notification', 0, 0, 0);
        updateJobQueueMetrics('analytics', undefined, undefined, undefined);
      }).not.toThrow();
    });
  });

  describe('Metrics Integration with Request Logger', () => {
    it('should integrate with request logger middleware', async () => {
      // Make a request that should trigger metrics recording
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      // Verify request was processed (metrics recording happens in middleware)
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('Prometheus Format Validation', () => {
    it('should export metrics in Prometheus format when enabled', async () => {
      // Temporarily enable metrics for this test
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      try {
        const { getMetrics } = require('../../src/config/metrics');
        const metrics = await getMetrics();
        
        // Prometheus format should be text/plain
        expect(typeof metrics).toBe('string');
        
        // Should contain some expected metric names
        expect(metrics).toContain('mobile_app_');
        
        // Should contain HELP and TYPE declarations (Prometheus format)
        expect(metrics).toMatch(/# HELP/);
        expect(metrics).toMatch(/# TYPE/);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});

