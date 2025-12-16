const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../../controllers/authController');
const { authenticate } = require('../../middleware/auth');
const { cache } = require('../../middleware/cache');
const { passwordResetLimiter } = require('../../middleware/rateLimiter');

// Enhanced validation rules with better error messages
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .trim()
    .notEmpty()
    .withMessage('Email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
    // Password strength check is optional - uncomment to enforce
    // .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    // .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
    // Name format check is optional - uncomment to enforce
    // .matches(/^[a-zA-Z\s'-]+$/)
    // .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .trim()
    .notEmpty()
    .withMessage('Email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 1 })
    .withMessage('Password cannot be empty'),
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string'),
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .trim()
    .notEmpty()
    .withMessage('Email is required'),
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isString()
    .withMessage('Reset token must be a string'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    // Password strength check is optional - uncomment to enforce
    // .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    // .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
    .optional({ checkFalsy: true }), // Make password strength check optional for now
];

const verifyEmailValidation = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
    .isString()
    .withMessage('Verification token must be a string'),
];

const resendVerificationValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .trim()
    .notEmpty()
    .withMessage('Email is required'),
];

// Cache key generator for /me endpoint
const meCacheKey = (req) => `cache:/api/v1/auth/me:${req.user.id}`;

// Routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/refresh', refreshTokenValidation, authController.refreshToken);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidation, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPasswordValidation, authController.resetPassword);
router.post('/verify-email', verifyEmailValidation, authController.verifyEmail);
router.post('/resend-verification', resendVerificationValidation, authController.resendVerification);
// Cache /me endpoint for 2 minutes (shorter TTL since user data changes less frequently)
router.get('/me', authenticate, cache(120, meCacheKey), authController.getMe);

module.exports = router;

