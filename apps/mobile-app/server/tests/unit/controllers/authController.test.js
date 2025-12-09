const authController = require('../../../src/controllers/authController');
const User = require('../../../src/models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Mock dependencies
jest.mock('../../../src/models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
}));
jest.mock('jsonwebtoken');
jest.mock('express-validator');

describe('Auth Controller Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock request
    mockReq = {
      body: {},
      user: null,
    };

    // Setup mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Setup mock next
    mockNext = jest.fn();

    // Setup default validation result (no errors)
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        toObject: jest.fn().mockReturnValue({
          _id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        }),
      };

      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      User.findOne.mockResolvedValue(null); // User doesn't exist
      User.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-jwt-token');

      await authController.register(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(User.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });
      expect(jwt.sign).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User registered successfully',
          token: 'mock-jwt-token',
          user: expect.objectContaining({
            email: 'test@example.com',
            name: 'Test User',
          }),
        })
      );
    });

    it('should return validation errors when validation fails', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { msg: 'Email is required', path: 'email' },
          { msg: 'Password must be at least 6 characters', path: 'password' },
        ],
      });

      mockReq.body = {
        email: 'invalid',
        password: '123',
      };

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        errors: expect.arrayContaining([
          expect.objectContaining({ msg: 'Email is required' }),
        ]),
      });
      expect(User.create).not.toHaveBeenCalled();
    });

    it('should return error if user already exists', async () => {
      const existingUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
      };

      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      User.findOne.mockResolvedValue(existingUser);

      await authController.register(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(User.create).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User already exists with this email',
      });
    });

    it('should handle server errors during registration', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      User.findOne.mockRejectedValue(new Error('Database error'));

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Server error during registration',
        })
      );
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Mock the chain: User.findOne({ email }).select('+password')
      // findOne returns a query object, select returns a promise
      const mockSelect = jest.fn().mockResolvedValue(mockUser);
      User.findOne.mockReturnValue({ select: mockSelect });
      
      jwt.sign.mockReturnValue('mock-jwt-token');

      await authController.login(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockSelect).toHaveBeenCalledWith('+password');
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(jwt.sign).toHaveBeenCalled();
      // Controller uses res.json() directly without res.status(200)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
          token: 'mock-jwt-token',
          user: expect.objectContaining({
            email: 'test@example.com',
          }),
        })
      );
    });

    it('should return error for invalid email', async () => {
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      // Mock the chain: User.findOne().select('+password') returns null
      const mockSelect = jest.fn().mockResolvedValue(null);
      User.findOne.mockReturnValue({ select: mockSelect });

      await authController.login(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
      expect(mockSelect).toHaveBeenCalledWith('+password');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid credentials',
      });
    });

    it('should return error for invalid password', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      mockReq.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Mock the chain: User.findOne().select('+password')
      const mockSelect = jest.fn().mockResolvedValue(mockUser);
      User.findOne.mockReturnValue({ select: mockSelect });

      await authController.login(mockReq, mockRes);

      expect(mockUser.comparePassword).toHaveBeenCalledWith('wrongpassword');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid credentials',
      });
    });

    it('should return error for inactive account', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isActive: false,
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Mock the chain: User.findOne().select('+password')
      const mockSelect = jest.fn().mockResolvedValue(mockUser);
      User.findOne.mockReturnValue({ select: mockSelect });

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Account is deactivated',
      });
    });
  });

  describe('getMe', () => {
    it('should return current user', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date('2024-01-01'),
      };

      mockReq.user = {
        id: '507f1f77bcf86cd799439011',
      };

      User.findById.mockResolvedValue(mockUser);

      await authController.getMe(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      // Controller uses res.json() directly without res.status(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        user: expect.objectContaining({
          id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          createdAt: mockUser.createdAt,
        }),
      });
    });

    it('should return 404 when user not found', async () => {
      mockReq.user = {
        id: '507f1f77bcf86cd799439011',
      };

      User.findById.mockResolvedValue(null);

      await authController.getMe(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User not found',
      });
    });
  });
});

