const { body, validationResult } = require('express-validator');
const { getWriteUserModel } = require('../utils/db-helper');
const logger = require('../config/logger');

/**
 * Get user preferences
 * GET /api/v1/profile/preferences
 */
exports.getPreferences = async (req, res) => {
  try {
    const WriteUser = await getWriteUserModel();
    const user = await WriteUser.findById(req.user.id).select('preferences');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      preferences: user.preferences || {
        notifications: { email: true, push: true },
        language: 'en',
        theme: 'auto',
      },
    });
  } catch (error) {
    logger.error('Error fetching preferences:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update user preferences
 * PUT /api/v1/profile/preferences
 */
exports.updatePreferences = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { notifications, language, theme } = req.body;
    const WriteUser = await getWriteUserModel();
    const user = await WriteUser.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize preferences if not exists
    if (!user.preferences) {
      user.preferences = {
        notifications: { email: true, push: true },
        language: 'en',
        theme: 'auto',
      };
    }

    // Update preferences
    if (notifications !== undefined) {
      if (notifications.email !== undefined) {
        user.preferences.notifications.email = notifications.email;
      }
      if (notifications.push !== undefined) {
        user.preferences.notifications.push = notifications.push;
      }
    }

    if (language !== undefined) {
      user.preferences.language = language;
    }

    if (theme !== undefined) {
      user.preferences.theme = theme;
    }

    await user.save();

    logger.info(`Preferences updated for user ${req.user.id}`);

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences,
    });
  } catch (error) {
    logger.error('Error updating preferences:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Validation rules for preferences update
 */
exports.updatePreferencesValidation = [
  body('notifications.email').optional().isBoolean().withMessage('Email notification preference must be boolean'),
  body('notifications.push').optional().isBoolean().withMessage('Push notification preference must be boolean'),
  body('language').optional().isString().isLength({ min: 2, max: 5 }).withMessage('Language must be 2-5 characters'),
  body('theme').optional().isIn(['light', 'dark', 'auto']).withMessage('Theme must be light, dark, or auto'),
];



