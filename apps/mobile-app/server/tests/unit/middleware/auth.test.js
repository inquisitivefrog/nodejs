const { authenticate, isAdmin } = require('../../../src/middleware/auth');
const passport = require('passport');

// Mock passport
jest.mock('passport');

describe('Auth Middleware Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: null,
      headers: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('authenticate', () => {
    it('should call next() when user is authenticated', () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
      };

      passport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req, res, next) => {
          callback(null, mockUser, null);
        };
      });

      authenticate(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      passport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req, res, next) => {
          callback(null, false, { message: 'No auth token' });
        };
      });

      authenticate(mockReq, mockRes, mockNext);

      // req.user should not be set when authentication fails
      expect(mockReq.user).toBeFalsy();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error when authentication fails', () => {
      const mockError = new Error('Authentication error');

      passport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req, res, next) => {
          callback(mockError, false, null);
        };
      });

      authenticate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(mockError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('isAdmin', () => {
    it('should call next() when user is admin', () => {
      mockReq.user = {
        _id: '507f1f77bcf86cd799439011',
        role: 'admin',
      };

      isAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not admin', () => {
      mockReq.user = {
        _id: '507f1f77bcf86cd799439011',
        role: 'user',
      };

      isAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Access denied. Admin privileges required.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is undefined', () => {
      mockReq.user = undefined;

      isAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Access denied. Admin privileges required.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user role is not admin', () => {
      mockReq.user = {
        _id: '507f1f77bcf86cd799439011',
        role: 'moderator', // Not admin
      };

      isAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

