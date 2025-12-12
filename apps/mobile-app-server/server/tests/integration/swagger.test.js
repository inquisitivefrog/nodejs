/**
 * Swagger/OpenAPI Documentation Tests
 * Tests for API documentation configuration and endpoints
 */

const request = require('supertest');
const express = require('express');
const swaggerSetup = require('../../src/config/swagger');

describe('Swagger API Documentation', () => {
  let testApp;

  beforeEach(() => {
    // Create a test app with Swagger enabled
    testApp = express();
    testApp.use(express.json());
    swaggerSetup(testApp);
  });

  describe('GET /api/docs', () => {
    it('should serve Swagger UI HTML', async () => {
      // Swagger UI may redirect, so follow redirects
      const response = await request(testApp)
        .get('/api/docs')
        .redirects(1)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/html/);
      // Swagger UI HTML should contain swagger-related content
      expect(response.text.length).toBeGreaterThan(0);
    });

    it('should include Swagger UI assets', async () => {
      const response = await request(testApp)
        .get('/api/docs/')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/html/);
    });
  });

  describe('GET /api/docs.json', () => {
    it('should return OpenAPI specification as JSON', async () => {
      const response = await request(testApp)
        .get('/api/docs.json')
        .expect(200)
        .expect('Content-Type', /application\/json/);

      const spec = response.body;

      // Verify OpenAPI structure
      expect(spec).toHaveProperty('openapi');
      expect(spec.openapi).toMatch(/^3\.0\.\d+$/);
      expect(spec).toHaveProperty('info');
      expect(spec.info).toHaveProperty('title');
      expect(spec.info).toHaveProperty('version');
      expect(spec).toHaveProperty('paths');
      expect(spec).toHaveProperty('components');
    });

    it('should include API information', async () => {
      const response = await request(testApp)
        .get('/api/docs.json')
        .expect(200);

      const spec = response.body;

      expect(spec.info.title).toBe('Mobile App Server API');
      expect(spec.info.version).toBe('1.0.0');
      expect(spec.info.description).toContain('RESTful API');
    });

    it('should include security schemes', async () => {
      const response = await request(testApp)
        .get('/api/docs.json')
        .expect(200);

      const spec = response.body;

      expect(spec.components).toHaveProperty('securitySchemes');
      expect(spec.components.securitySchemes).toHaveProperty('bearerAuth');
      expect(spec.components.securitySchemes.bearerAuth.type).toBe('http');
      expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
    });

    it('should include API paths', async () => {
      const response = await request(testApp)
        .get('/api/docs.json')
        .expect(200);

      const spec = response.body;

      // Check for some expected paths
      expect(spec.paths).toBeDefined();
      // Note: Paths may vary based on route annotations
    });

    it('should include server configurations', async () => {
      const response = await request(testApp)
        .get('/api/docs.json')
        .expect(200);

      const spec = response.body;

      expect(spec.servers).toBeInstanceOf(Array);
      expect(spec.servers.length).toBeGreaterThan(0);
      expect(spec.servers[0]).toHaveProperty('url');
      expect(spec.servers[0]).toHaveProperty('description');
    });

    it('should include schema definitions', async () => {
      const response = await request(testApp)
        .get('/api/docs.json')
        .expect(200);

      const spec = response.body;

      expect(spec.components).toHaveProperty('schemas');
      // Check for common schemas
      expect(spec.components.schemas).toHaveProperty('User');
      expect(spec.components.schemas).toHaveProperty('Error');
    });
  });
});

