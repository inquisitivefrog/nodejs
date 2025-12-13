const DeviceToken = require('../models/DeviceToken');
const { body, validationResult } = require('express-validator');
const logger = require('../config/logger');

/**
 * Register or update device token
 * POST /api/v1/devices/register
 */
exports.registerDeviceToken = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { token, platform, deviceId, appVersion } = req.body;
    const userId = req.user.id;

    // Check if token already exists
    let deviceToken = await DeviceToken.findOne({ token });

    if (deviceToken) {
      // Update existing token
      if (deviceToken.userId.toString() !== userId) {
        // Token belongs to different user - deactivate old and update to new user
        deviceToken.isActive = false;
        deviceToken.lastUsedAt = new Date();
        await deviceToken.save();
        
        // Update the existing token to belong to new user
        deviceToken.userId = userId;
        deviceToken.platform = platform;
        deviceToken.deviceId = deviceId;
        deviceToken.appVersion = appVersion;
        deviceToken.isActive = true;
        deviceToken.lastUsedAt = new Date();
        await deviceToken.save();
      } else {
        // Update existing token for same user
        deviceToken.platform = platform;
        deviceToken.deviceId = deviceId;
        deviceToken.appVersion = appVersion;
        deviceToken.isActive = true;
        deviceToken.lastUsedAt = new Date();
        await deviceToken.save();
      }
    } else {
      // Create new token
      deviceToken = await DeviceToken.create({
        userId,
        token,
        platform,
        deviceId,
        appVersion,
      });
    }

    logger.info(`Device token registered for user ${userId}: ${platform}`);

    res.status(200).json({
      message: 'Device token registered successfully',
      deviceToken: {
        id: deviceToken._id,
        platform: deviceToken.platform,
        deviceId: deviceToken.deviceId,
        appVersion: deviceToken.appVersion,
        isActive: deviceToken.isActive,
      },
    });
  } catch (error) {
    logger.error('Error registering device token:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Unregister device token
 * DELETE /api/v1/devices/:token
 */
exports.unregisterDeviceToken = async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user.id;

    const deviceToken = await DeviceToken.findOne({ token, userId });

    if (!deviceToken) {
      return res.status(404).json({ message: 'Device token not found' });
    }

    await deviceToken.deactivate();

    logger.info(`Device token unregistered for user ${userId}`);

    res.status(200).json({ message: 'Device token unregistered successfully' });
  } catch (error) {
    logger.error('Error unregistering device token:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get user's device tokens
 * GET /api/v1/devices
 */
exports.getDeviceTokens = async (req, res) => {
  try {
    const userId = req.user.id;

    const deviceTokens = await DeviceToken.find({ userId, isActive: true }).select(
      '-token -__v'
    );

    res.status(200).json({
      devices: deviceTokens,
    });
  } catch (error) {
    logger.error('Error fetching device tokens:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Validation rules for device token registration
 */
exports.registerDeviceTokenValidation = [
  body('token').notEmpty().withMessage('Device token is required'),
  body('platform')
    .isIn(['ios', 'android', 'web'])
    .withMessage('Platform must be ios, android, or web'),
  body('deviceId').optional().isString(),
  body('appVersion').optional().isString(),
];

