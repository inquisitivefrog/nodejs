/**
 * Logger Middleware Unit Tests
 * Tests for request/response logging middleware
 */

const requestLogger = require('../../../src/middleware/logger');
const logger = require('../../../src/config/logger');

// Mock logger
jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('Logger Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'GET',
      path: '/test',
      query: {},
      body: {},
      ip: '127.0.0.1',
      get: jest.fn((header) => {
        if (header === 'user-agent') return 'test-agent';
        return null;
      }),
    };

    res = {
      setHeader: jest.fn(),
      send: jest.fn(function (data) {
        this.statusCode = 200;
        return this;
      }),
      statusCode: 200,
    };

    next = jest.fn();

    // Clear mocks
    jest.clearAllMocks();
  });

  it('should generate request ID', () => {
    requestLogger(req, res, next);

    expect(req.requestId).toBeDefined();
    expect(typeof req.requestId).toBe('string');
    expect(req.requestId.length).toBeGreaterThan(0);
  });

  it('should set X-Request-ID header', () => {
    requestLogger(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
  });

  it('should log incoming request', () => {
    requestLogger(req, res, next);

    expect(logger.info).toHaveBeenCalledWith(
      'Incoming request',
      expect.objectContaining({
        requestId: expect.any(String),
        method: 'GET',
        path: '/test',
        ip: '127.0.0.1',
      })
    );
  });

  it('should log outgoing response', () => {
    requestLogger(req, res, next);

    // Call res.send to trigger response logging
    res.send({ data: 'test' });

    expect(logger.info).toHaveBeenCalledWith(
      'Outgoing response',
      expect.objectContaining({
        requestId: expect.any(String),
        method: 'GET',
        path: '/test',
        statusCode: 200,
        duration: expect.any(String),
      })
    );
  });

  it('should log error responses as errors', () => {
    requestLogger(req, res, next);

    res.statusCode = 500;
    res.send({ error: 'test' });

    expect(logger.info).toHaveBeenCalledWith(
      'Outgoing response',
      expect.objectContaining({
        level: 'error',
        statusCode: 500,
      })
    );
  });

  it('should sanitize sensitive data in request body', () => {
    req.body = {
      email: 'test@example.com',
      password: 'secret123',
      token: 'secret-token',
    };

    requestLogger(req, res, next);

    expect(logger.info).toHaveBeenCalledWith(
      'Incoming request',
      expect.objectContaining({
        body: expect.objectContaining({
          email: 'test@example.com',
          password: '[REDACTED]',
          token: '[REDACTED]',
        }),
      })
    );
  });

  it('should call next()', () => {
    requestLogger(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should handle missing user-agent', () => {
    req.get = jest.fn(() => null);

    requestLogger(req, res, next);

    expect(logger.info).toHaveBeenCalledWith(
      'Incoming request',
      expect.objectContaining({
        userAgent: 'unknown',
      })
    );
  });

  it('should calculate response duration', (done) => {
    requestLogger(req, res, next);

    setTimeout(() => {
      res.send({ data: 'test' });

      expect(logger.info).toHaveBeenCalledWith(
        'Outgoing response',
        expect.objectContaining({
          duration: expect.stringMatching(/\d+ms/),
        })
      );

      done();
    }, 10);
  });
});

