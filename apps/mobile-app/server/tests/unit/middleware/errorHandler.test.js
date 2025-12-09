const errorHandler = require('../../../src/middleware/errorHandler');

describe('Error Handler Middleware Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Set NODE_ENV to test to suppress console.error
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env.NODE_ENV = 'test';
  });

  describe('Mongoose ValidationError', () => {
    it('should handle ValidationError with multiple fields', () => {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = {
        email: { message: 'Email is required' },
        password: { message: 'Password is required' },
        name: { message: 'Name is required' },
      };

      errorHandler(validationError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Validation error',
        errors: ['Email is required', 'Password is required', 'Name is required'],
      });
    });

    it('should handle ValidationError with single field', () => {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = {
        email: { message: 'Email is required' },
      };

      errorHandler(validationError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Validation error',
        errors: ['Email is required'],
      });
    });
  });

  describe('Mongoose Duplicate Key Error', () => {
    it('should handle duplicate key error with email field', () => {
      const duplicateError = new Error('Duplicate key');
      duplicateError.code = 11000;
      duplicateError.keyPattern = { email: 1 };

      errorHandler(duplicateError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Duplicate email value entered',
        field: 'email',
      });
    });

    it('should handle duplicate key error with unknown field', () => {
      const duplicateError = new Error('Duplicate key');
      duplicateError.code = 11000;
      duplicateError.keyPattern = {};

      errorHandler(duplicateError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Duplicate field value entered',
        field: 'field',
      });
    });
  });

  describe('JWT Errors', () => {
    it('should handle JsonWebTokenError', () => {
      const jwtError = new Error('jwt malformed');
      jwtError.name = 'JsonWebTokenError';

      errorHandler(jwtError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid token',
      });
    });

    it('should handle TokenExpiredError', () => {
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';

      errorHandler(expiredError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Token expired',
      });
    });
  });

  describe('Authentication Errors', () => {
    it('should handle AuthenticationError', () => {
      const authError = new Error('Unauthorized');
      authError.name = 'AuthenticationError';

      errorHandler(authError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Unauthorized',
      });
    });

    it('should handle error with "Unauthorized" message', () => {
      const authError = new Error('Unauthorized');

      errorHandler(authError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Unauthorized',
      });
    });
  });

  describe('Default Error Handling', () => {
    it('should handle error with custom status code', () => {
      const customError = new Error('Not found');
      customError.status = 404;

      errorHandler(customError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Not found',
      });
    });

    it('should handle error without status code (defaults to 500)', () => {
      const customError = new Error('Server error');

      errorHandler(customError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Server error',
      });
    });

    it('should handle error without message (defaults to "Server error")', () => {
      const customError = {};

      errorHandler(customError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Server error',
      });
    });

    it('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const customError = new Error('Test error');
      customError.stack = 'Error: Test error\n    at test.js:1:1';

      errorHandler(customError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Test error',
        stack: 'Error: Test error\n    at test.js:1:1',
      });

      process.env.NODE_ENV = 'test';
    });
  });
});

