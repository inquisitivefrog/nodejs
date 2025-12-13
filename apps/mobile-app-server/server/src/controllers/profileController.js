const { body, validationResult } = require('express-validator');
const { getReadUserModel, getWriteUserModel } = require('../utils/db-helper');
const bcrypt = require('bcrypt');
const logger = require('../config/logger');

/**
 * Get current user profile
 * GET /api/v1/profile
 */
exports.getProfile = async (req, res) => {
  try {
    const ReadUser = await getReadUserModel();
    const user = await ReadUser.findById(req.user.id)
      .select('-password -refreshToken -refreshTokenExpires -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Transform _id to id for consistency
    const userResponse = {
      ...user,
      id: user._id,
    };
    delete userResponse._id;

    res.json({ user: userResponse });
  } catch (error) {
    logger.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update current user profile
 * PUT /api/v1/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { name, email } = req.body;
    const WriteUser = await getWriteUserModel();
    const user = await WriteUser.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await WriteUser.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: 'Email already registered' });
      }
      // If email is changed, mark as unverified
      user.emailVerified = false;
      user.email = email;
    }

    if (name !== undefined) {
      user.name = name;
    }

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;
    delete userResponse.refreshTokenExpires;
    delete userResponse.passwordResetToken;
    delete userResponse.passwordResetExpires;
    delete userResponse.emailVerificationToken;
    delete userResponse.emailVerificationExpires;

    logger.info(`Profile updated for user ${req.user.id}`);

    res.json({
      message: 'Profile updated successfully',
      user: userResponse,
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Change password
 * PUT /api/v1/profile/password
 */
exports.changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const WriteUser = await getWriteUserModel();
    const user = await WriteUser.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user ${req.user.id}`);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Validation rules for profile update
 */
exports.updateProfileValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
];

/**
 * Validation rules for password change
 */
exports.changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
];

