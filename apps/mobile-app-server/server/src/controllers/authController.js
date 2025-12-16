const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { invalidateCache } = require('../middleware/cache');
const EmailService = require('../services/email.service');
const NotificationService = require('../services/notification.service');
const AnalyticsService = require('../services/analytics.service');
const { getReadUserModel, getWriteUserModel } = require('../utils/db-helper');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // Short-lived access tokens
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'; // Long-lived refresh tokens

// Generate access token (short-lived)
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId.toString() }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

// Generate refresh token (long-lived, stored in DB)
const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Set refresh token expiration date
const getRefreshTokenExpiration = () => {
  const expiresInDays = parseInt(REFRESH_TOKEN_EXPIRES_IN) || 7;
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + expiresInDays);
  return expirationDate;
};

exports.register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    // Validate required fields are present (additional check in case validation middleware didn't catch it)
    if (!email || !password || !name) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        errors: [
          ...(!email ? [{ msg: 'Email is required', param: 'email' }] : []),
          ...(!password ? [{ msg: 'Password is required', param: 'password' }] : []),
          ...(!name ? [{ msg: 'Name is required', param: 'name' }] : []),
        ]
      });
    }

    // Use read pool to check if user exists (read operation)
    const ReadUser = await getReadUserModel();
    const existingUser = await ReadUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Use write pool to create new user (write operation)
    const WriteUser = await getWriteUserModel();
    const user = await WriteUser.create({
      email,
      password,
      name,
    });

    // Invalidate user list cache since a new user was added
    await invalidateCache('cache:/api/v1/users*');

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();
    const refreshTokenExpires = getRefreshTokenExpiration();

    // Store refresh token in database
    user.refreshToken = refreshToken;
    user.refreshTokenExpires = refreshTokenExpires;
    await user.save();

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24); // 24 hours

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;
    await user.save();

    // Enqueue async jobs (non-blocking - don't wait for completion)
    // These will be processed by background workers
    EmailService.sendWelcomeEmail(user).catch((err) => {
      console.error('Failed to enqueue welcome email:', err.message);
    });
    
    EmailService.sendVerificationEmail(user, emailVerificationToken).catch((err) => {
      console.error('Failed to enqueue verification email:', err.message);
    });
    
    NotificationService.sendWelcomeNotification(user._id.toString()).catch((err) => {
      console.error('Failed to enqueue welcome notification:', err.message);
    });
    
    AnalyticsService.logUserRegistration(user._id.toString(), {
      email: user.email,
      registrationMethod: 'email',
    }).catch((err) => {
      console.error('Failed to enqueue analytics event:', err.message);
    });

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Use write pool for login (needs to read password, so use primary for consistency)
    // Login operations should use primary to ensure we get the latest password hash
    const WriteUser = await getWriteUserModel();
    const user = await WriteUser.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();
    const refreshTokenExpires = getRefreshTokenExpiration();

    // Store refresh token in database (refresh token rotation)
    user.refreshToken = refreshToken;
    user.refreshTokenExpires = refreshTokenExpires;
    await user.save();

    // Log login event asynchronously (non-blocking)
    AnalyticsService.logUserLogin(user._id.toString(), {
      email: user.email,
      loginMethod: 'email',
    }).catch((err) => {
      console.error('Failed to enqueue analytics event:', err.message);
    });

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    // Use read pool for getMe (read operation - can use secondary)
    const ReadUser = await getReadUserModel();
    const user = await ReadUser.findById(req.user.id)
      .lean(); // Use lean() for better performance with caching
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        profilePicture: user.profilePicture || null,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Refresh access token using refresh token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Use write pool to find user with refresh token
    const WriteUser = await getWriteUserModel();
    const user = await WriteUser.findOne({
      refreshToken,
      refreshTokenExpires: { $gt: new Date() }, // Token not expired
    }).select('+refreshToken +refreshTokenExpires');

    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user._id);

    // Optionally rotate refresh token (security best practice)
    const newRefreshToken = generateRefreshToken();
    const refreshTokenExpires = getRefreshTokenExpiration();

    user.refreshToken = newRefreshToken;
    user.refreshTokenExpires = refreshTokenExpires;
    await user.save();

    res.json({
      message: 'Token refreshed successfully',
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Forgot password - send reset email
exports.forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Use read pool to find user
    const ReadUser = await getReadUserModel();
    const user = await ReadUser.findOne({ email });

    // Don't reveal if user exists (security best practice)
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiration

    // Use write pool to update user
    const WriteUser = await getWriteUserModel();
    await WriteUser.findByIdAndUpdate(user._id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });

    // Send password reset email
    EmailService.sendPasswordResetEmail(user, resetToken).catch((err) => {
      console.error('Failed to enqueue password reset email:', err.message);
    });

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reset password using token
exports.resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Reset token is required' });
    }

    // Use write pool to find user with valid reset token
    const WriteUser = await getWriteUserModel();
    const user = await WriteUser.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }, // Token not expired
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // Invalidate refresh tokens on password change (security)
    user.refreshToken = undefined;
    user.refreshTokenExpires = undefined;
    await user.save();

    // Invalidate cache
    await invalidateCache(`cache:/api/v1/auth/me:${user._id}`);

    // Send push notification (if user has device tokens)
    NotificationService.sendPasswordResetNotification(user._id.toString()).catch((err) => {
      console.error('Failed to enqueue password reset notification:', err.message);
    });

    res.json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify email using token
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    // Use write pool to find user with valid verification token
    const WriteUser = await getWriteUserModel();
    const user = await WriteUser.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }, // Token not expired
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Invalidate cache
    await invalidateCache(`cache:/api/v1/auth/me:${user._id}`);

    // Send push notification (if user has device tokens)
    NotificationService.sendEmailVerificationNotification(user._id.toString()).catch((err) => {
      console.error('Failed to enqueue email verification notification:', err.message);
    });

    res.json({
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Resend verification email
exports.resendVerification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Use read pool to find user
    const ReadUser = await getReadUserModel();
    const user = await ReadUser.findOne({ email });

    // Don't reveal if user exists (security best practice)
    if (!user) {
      return res.json({
        message: 'If an account with that email exists and is not verified, a verification email has been sent.',
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.json({
        message: 'Email is already verified',
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours

    // Use write pool to update user
    const WriteUser = await getWriteUserModel();
    await WriteUser.findByIdAndUpdate(user._id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    // Send verification email
    EmailService.sendVerificationEmail(user, verificationToken).catch((err) => {
      console.error('Failed to enqueue verification email:', err.message);
    });

    res.json({
      message: 'If an account with that email exists and is not verified, a verification email has been sent.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

