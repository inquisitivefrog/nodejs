const request = require('supertest');
const mongoose = require('mongoose');
const { setupTestDB, clearDatabase } = require('../helpers/testHelpers');
const app = require('../../src/app');

describe('Error Handler Middleware', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('ValidationError', () => {
    it('should handle express-validator validation errors', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email', // Invalid email format
          password: '123', // Too short
          name: '', // Empty name
        });

      expect(response.status).toBe(400);
      // express-validator returns errors array directly, not wrapped in message
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should handle Mongoose ValidationError from model', async () => {
      // Test Mongoose ValidationError by directly creating a user with invalid data
      const User = require('../../src/models/User');
      const errorHandler = require('../../src/middleware/errorHandler');
      
      const req = {};
      let statusCode;
      let jsonData;
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          jsonData = data;
        },
      };
      const next = () => {};

      // Create a mock Mongoose ValidationError
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = {
        email: { message: 'Email is required' },
        password: { message: 'Password is required' },
      };

      errorHandler(validationError, req, res, next);

      expect(statusCode).toBe(400);
      expect(jsonData).toHaveProperty('message', 'Validation error');
      expect(jsonData).toHaveProperty('errors');
      expect(Array.isArray(jsonData.errors)).toBe(true);
    });
  });

  describe('Duplicate Key Error', () => {
    it('should handle duplicate email error', async () => {
      const User = require('../../src/models/User');

      // Create first user
      await User.create({
        email: 'duplicate@example.com',
        password: 'password123',
        name: 'First User',
      });

      // Try to create duplicate
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'Second User',
        });

      expect(response.status).toBe(400);
      // The controller checks for existing user before creating, so it returns
      // "User already exists with this email" instead of going through error handler
      expect(response.body.message).toBeDefined();
      expect(response.body.message).toMatch(/already exists|duplicate/i);
    });
  });

  describe('JWT Errors', () => {
    it('should handle JsonWebTokenError through error handler', () => {
      const errorHandler = require('../../src/middleware/errorHandler');
      const req = {};
      let statusCode;
      let jsonData;
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          jsonData = data;
        },
      };
      const next = () => {};

      const jwtError = new Error('jwt malformed');
      jwtError.name = 'JsonWebTokenError';

      errorHandler(jwtError, req, res, next);

      expect(statusCode).toBe(401);
      expect(jsonData).toEqual({ message: 'Invalid token' });
    });

    it('should handle TokenExpiredError through error handler', () => {
      const errorHandler = require('../../src/middleware/errorHandler');
      const req = {};
      let statusCode;
      let jsonData;
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          jsonData = data;
        },
      };
      const next = () => {};

      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';

      errorHandler(expiredError, req, res, next);

      expect(statusCode).toBe(401);
      expect(jsonData).toEqual({ message: 'Token expired' });
    });

    it('should handle invalid JWT token in request', async () => {
      // This tests the actual flow - invalid tokens are caught by auth middleware
      // and return "Unauthorized", not "Invalid token"
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(response.status).toBe(401);
      // Auth middleware returns "Unauthorized" for invalid tokens
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('Default Error Handling', () => {
    it('should handle unknown errors with 500 status', () => {
      const errorHandler = require('../../src/middleware/errorHandler');
      const req = {};
      let statusCode;
      let jsonData;
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          jsonData = data;
        },
      };
      const next = () => {};
      const customError = new Error('Custom error');
      customError.status = 500;

      errorHandler(customError, req, res, next);

      expect(statusCode).toBe(500);
      expect(jsonData).toHaveProperty('message', 'Custom error');
    });

    it('should handle errors with custom status code', () => {
      const errorHandler = require('../../src/middleware/errorHandler');
      const req = {};
      let statusCode;
      let jsonData;
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          jsonData = data;
        },
      };
      const next = () => {};
      const customError = new Error('Not found');
      customError.status = 404;

      errorHandler(customError, req, res, next);

      expect(statusCode).toBe(404);
      expect(jsonData).toHaveProperty('message', 'Not found');
    });

    it('should handle errors without message', () => {
      const errorHandler = require('../../src/middleware/errorHandler');
      const req = {};
      let statusCode;
      let jsonData;
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          jsonData = data;
        },
      };
      const next = () => {};
      const customError = {};

      errorHandler(customError, req, res, next);

      expect(statusCode).toBe(500);
      expect(jsonData).toHaveProperty('message', 'Server error');
    });
  });

  describe('AuthenticationError', () => {
    it('should handle AuthenticationError', () => {
      const errorHandler = require('../../src/middleware/errorHandler');
      const req = {};
      let statusCode;
      let jsonData;
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          jsonData = data;
        },
      };
      const next = () => {};
      const authError = new Error('Unauthorized');
      authError.name = 'AuthenticationError';

      errorHandler(authError, req, res, next);

      expect(statusCode).toBe(401);
      expect(jsonData).toEqual({ message: 'Unauthorized' });
    });

    it('should handle errors with "Unauthorized" message', () => {
      const errorHandler = require('../../src/middleware/errorHandler');
      const req = {};
      let statusCode;
      let jsonData;
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          jsonData = data;
        },
      };
      const next = () => {};
      const authError = new Error('Unauthorized');

      errorHandler(authError, req, res, next);

      expect(statusCode).toBe(401);
      expect(jsonData).toEqual({ message: 'Unauthorized' });
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Route not found');
    });
  });
});

