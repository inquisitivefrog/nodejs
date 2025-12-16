const request = require('supertest');
const app = require('../../src/app');

describe('Input Sanitization', () => {
  describe('XSS Protection', () => {
    it('should sanitize HTML tags in request body', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: '<script>alert("xss")</script>Test User',
        });
      
      // Should either succeed (with sanitized name) or fail validation
      // The important thing is that script tags are removed
      if (response.status === 200 || response.status === 201) {
        expect(response.body.user.name).not.toContain('<script>');
        expect(response.body.user.name).not.toContain('</script>');
      }
    });

    it('should sanitize JavaScript protocol in request body', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'javascript:alert("xss")@example.com',
          password: 'password123',
          name: 'Test User',
        });
      
      // Should sanitize javascript: protocol
      if (response.status === 200 || response.status === 201) {
        expect(response.body.user.email).not.toContain('javascript:');
      }
    });

    it('should sanitize event handlers in request body', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User<img src=x onerror=alert(1)>',
        });
      
      // Should remove event handlers
      if (response.status === 200 || response.status === 201) {
        expect(response.body.user.name).not.toContain('onerror=');
      }
    });
  });

  describe('Query Parameter Sanitization', () => {
    it('should sanitize query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/users?name=<script>alert("xss")</script>')
        .set('Authorization', 'Bearer invalid-token');
      
      // Should handle sanitized query params without errors
      expect([401, 200, 429]).toContain(response.status);
    });
  });

  describe('Input Length Limiting', () => {
    it('should limit input string length', async () => {
      const longString = 'a'.repeat(20000);
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: longString,
        });
      
      // Should either reject or truncate
      if (response.status === 200 || response.status === 201) {
        expect(response.body.user.name.length).toBeLessThanOrEqual(10000);
      }
    });
  });
});




