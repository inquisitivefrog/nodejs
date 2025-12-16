/**
 * CORS Configuration Tests
 * Tests for CORS behavior and configuration
 */

const request = require('supertest');
const app = require('../../src/app');

describe('CORS Configuration', () => {
  describe('CORS Headers', () => {
    it('should include CORS headers in response', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      // CORS headers should be present
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should allow credentials', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-credentials');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should include allowed methods', async () => {
      const response = await request(app)
        .options('/api/v1/users')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-methods');
      const methods = response.headers['access-control-allow-methods'];
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('DELETE');
    });

    it('should include allowed headers', async () => {
      const response = await request(app)
        .options('/api/v1/users')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-headers');
      const headers = response.headers['access-control-allow-headers'];
      expect(headers).toContain('Content-Type');
      expect(headers).toContain('Authorization');
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });

  describe('CORS Origin Handling', () => {
    it('should allow requests from localhost origins', async () => {
      const origins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://localhost:8080',
      ];

      for (const origin of origins) {
        const response = await request(app)
          .get('/health')
          .set('Origin', origin)
          .expect(200);

        expect(response.headers['access-control-allow-origin']).toBe(origin);
      }
    });

    it('should allow requests with no origin (mobile apps)', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Should not error even without Origin header
      expect(response.status).toBe(200);
    });
  });

  describe('CORS with Authentication', () => {
    it('should include CORS headers in authenticated requests', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Origin', 'http://localhost:3000')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401); // Will fail auth but should include CORS headers

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});




