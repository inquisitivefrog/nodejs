const authController = require('../../../src/controllers/authController');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Create mock models that will be used by both User and db-helper mocks
const createMockModel = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
});

// Mock User model
const mockUserModel = createMockModel();
jest.mock('../../../src/models/User', () => mockUserModel);

// Mock db-helper to return separate mock models
const mockReadUserModel = createMockModel();
const mockWriteUserModel = createMockModel();

jest.mock('../../../src/utils/db-helper', () => ({
  getReadUserModel: jest.fn(() => Promise.resolve(mockReadUserModel)),
  getWriteUserModel: jest.fn(() => Promise.resolve(mockWriteUserModel)),
}));

jest.mock('jsonwebtoken');
jest.mock('crypto');
jest.mock('express-validator');
jest.mock('../../../src/middleware/cache', () => ({
  invalidateCache: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/services/email.service', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/services/notification.service', () => ({
  sendWelcomeNotification: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetNotification: jest.fn().mockResolvedValue(undefined),
  sendEmailVerificationNotification: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/services/analytics.service', () => ({
  logUserRegistration: jest.fn().mockResolvedValue(undefined),
  logUserLogin: jest.fn().mockResolvedValue(undefined),
}));

describe('Auth Controller Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset mock model methods
    Object.keys(mockReadUserModel).forEach(key => {
      if (jest.isMockFunction(mockReadUserModel[key])) {
        mockReadUserModel[key].mockClear();
      }
    });
    Object.keys(mockWriteUserModel).forEach(key => {
      if (jest.isMockFunction(mockWriteUserModel[key])) {
        mockWriteUserModel[key].mockClear();
      }
    });

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
        emailVerified: false,
        toObject: jest.fn().mockReturnValue({
          _id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          emailVerified: false,
        }),
      };

      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const crypto = require('crypto');
      mockReadUserModel.findOne.mockResolvedValue(null); // User doesn't exist
      
      // Mock user with save method for refresh token and email verification
      const mockUserWithSave = {
        ...mockUser,
        emailVerified: false,
        save: jest.fn().mockResolvedValue(mockUser),
        refreshToken: undefined,
        refreshTokenExpires: undefined,
        emailVerificationToken: undefined,
        emailVerificationExpires: undefined,
      };
      mockWriteUserModel.create.mockResolvedValue(mockUserWithSave);
      jwt.sign.mockReturnValue('mock-access-token');
      crypto.randomBytes = jest.fn().mockReturnValue({ toString: () => 'mock-refresh-token' });

      await authController.register(mockReq, mockRes);

      expect(mockReadUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockWriteUserModel.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });
      expect(jwt.sign).toHaveBeenCalled();
      expect(mockUserWithSave.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User registered successfully',
          accessToken: 'mock-access-token',
          refreshToken: expect.any(String),
          user: expect.objectContaining({
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: false,
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
      expect(mockWriteUserModel.create).not.toHaveBeenCalled();
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

      mockReadUserModel.findOne.mockResolvedValue(existingUser);

      await authController.register(mockReq, mockRes);

      expect(mockReadUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockWriteUserModel.create).not.toHaveBeenCalled();
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

      mockReadUserModel.findOne.mockRejectedValue(new Error('Database error'));

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

      // Mock the chain: WriteUser.findOne({ email }).select('+password')
      // findOne returns a query object, select returns a promise
      const mockUserWithSave = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
        refreshToken: undefined,
        refreshTokenExpires: undefined,
      };
      const mockSelect = jest.fn().mockResolvedValue(mockUserWithSave);
      mockWriteUserModel.findOne.mockReturnValue({ select: mockSelect });
      
      const crypto = require('crypto');
      jwt.sign.mockReturnValue('mock-access-token');
      crypto.randomBytes = jest.fn().mockReturnValue({ toString: () => 'mock-refresh-token' });

      await authController.login(mockReq, mockRes);

      expect(mockWriteUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockSelect).toHaveBeenCalledWith('+password');
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(jwt.sign).toHaveBeenCalled();
      expect(mockUserWithSave.save).toHaveBeenCalled();
      // Controller uses res.json() directly without res.status(200)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
          accessToken: 'mock-access-token',
          refreshToken: expect.any(String),
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

      // Mock the chain: WriteUser.findOne().select('+password') returns null
      const mockSelect = jest.fn().mockResolvedValue(null);
      mockWriteUserModel.findOne.mockReturnValue({ select: mockSelect });

      await authController.login(mockReq, mockRes);

      expect(mockWriteUserModel.findOne).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
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

      // Mock the chain: WriteUser.findOne().select('+password')
      const mockSelect = jest.fn().mockResolvedValue(mockUser);
      mockWriteUserModel.findOne.mockReturnValue({ select: mockSelect });

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

      // Mock the chain: WriteUser.findOne().select('+password')
      const mockSelect = jest.fn().mockResolvedValue(mockUser);
      mockWriteUserModel.findOne.mockReturnValue({ select: mockSelect });

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

      // Mock the chain: ReadUser.findById().lean()
      // Note: We no longer use .read() since we're using separate pools
      const mockLean = jest.fn().mockResolvedValue(mockUser);
      mockReadUserModel.findById.mockReturnValue({ lean: mockLean });

      await authController.getMe(mockReq, mockRes);

      expect(mockReadUserModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockLean).toHaveBeenCalled();
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

      // Mock the chain: ReadUser.findById().lean() returns null
      // Note: We no longer use .read() since we're using separate pools
      const mockLean = jest.fn().mockResolvedValue(null);
      mockReadUserModel.findById.mockReturnValue({ lean: mockLean });

      await authController.getMe(mockReq, mockRes);

      expect(mockReadUserModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockLean).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User not found',
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        save: jest.fn().mockResolvedValue(true),
        refreshToken: 'valid-refresh-token',
        refreshTokenExpires: new Date(Date.now() + 86400000),
      };

      mockReq.body = { refreshToken: 'valid-refresh-token' };
      const mockSelect = jest.fn().mockResolvedValue(mockUser);
      mockWriteUserModel.findOne.mockReturnValue({ select: mockSelect });
      
      const crypto = require('crypto');
      jwt.sign.mockReturnValue('new-access-token');
      crypto.randomBytes = jest.fn().mockReturnValue({ toString: () => 'new-refresh-token' });

      await authController.refreshToken(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token refreshed successfully',
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        })
      );
    });

    it('should return error for missing refresh token', async () => {
      mockReq.body = {};
      await authController.refreshToken(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      const mockUser = { _id: '507f1f77bcf86cd799439011', email: 'test@example.com' };
      mockReq.body = { email: 'test@example.com' };
      mockReadUserModel.findOne.mockResolvedValue(mockUser);
      mockWriteUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      await authController.forgotPassword(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        passwordResetToken: 'valid-token',
        passwordResetExpires: new Date(Date.now() + 3600000),
        save: jest.fn().mockResolvedValue(true),
      };
      mockReq.body = { token: 'valid-token', password: 'newpassword123' };
      const mockSelect = jest.fn().mockResolvedValue(mockUser);
      mockWriteUserModel.findOne.mockReturnValue({ select: mockSelect });

      await authController.resetPassword(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Password reset successfully' });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        emailVerified: false,
        emailVerificationToken: 'valid-token',
        emailVerificationExpires: new Date(Date.now() + 86400000),
        save: jest.fn().mockResolvedValue(true),
      };
      mockReq.body = { token: 'valid-token' };
      const mockSelect = jest.fn().mockResolvedValue(mockUser);
      mockWriteUserModel.findOne.mockReturnValue({ select: mockSelect });

      await authController.verifyEmail(mockReq, mockRes);
      expect(mockUser.emailVerified).toBe(true);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email verified successfully' });
    });
  });

  describe('resendVerification', () => {
    it('should resend verification email', async () => {
      const mockUser = { _id: '507f1f77bcf86cd799439011', email: 'test@example.com', emailVerified: false };
      mockReq.body = { email: 'test@example.com' };
      mockReadUserModel.findOne.mockResolvedValue(mockUser);
      mockWriteUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      await authController.resendVerification(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });
});
