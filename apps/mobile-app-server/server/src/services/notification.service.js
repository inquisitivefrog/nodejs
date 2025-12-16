const { enqueueJob, QUEUE_NAMES } = require('../config/queue');
const DeviceToken = require('../models/DeviceToken');

/**
 * Push notification service - enqueues notification jobs for async processing
 */
class NotificationService {
  /**
   * Send push notification to user
   * If deviceTokens are not provided, will fetch active tokens from database
   */
  static async sendNotification(userId, title, body, data = {}, deviceTokens = null) {
    // If deviceTokens not provided, fetch from database
    let tokensToUse = deviceTokens;
    if (tokensToUse === null) {
      try {
        // Check if mongoose connection is ready before querying
        const mongoose = require('mongoose');
        // In test mode, skip DeviceToken query if connection not ready to avoid timeouts
        if (process.env.NODE_ENV === 'test' && mongoose.connection.readyState !== 1) {
          tokensToUse = [];
        } else if (mongoose.connection.readyState === 1) {
          // Use Promise.race to timeout the query if it takes too long
          const queryPromise = DeviceToken.getActiveTokensForUser(userId);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), 5000)
          );
          
          try {
            const activeTokens = await Promise.race([queryPromise, timeoutPromise]);
            tokensToUse = activeTokens.map((dt) => dt.token);
          } catch (queryError) {
            // Query failed or timed out, use empty array
            tokensToUse = [];
          }
        } else {
          // Connection not ready, use empty array (will skip notification)
          tokensToUse = [];
        }
      } catch (error) {
        // If query fails (e.g., in test environment), use empty array
        tokensToUse = [];
      }
    }

    return await enqueueJob(
      QUEUE_NAMES.NOTIFICATION,
      {
        userId,
        title,
        body,
        data,
        deviceTokens: tokensToUse || [],
      },
      {
        priority: 5,
      }
    );
  }

  /**
   * Send welcome notification to new user
   */
  static async sendWelcomeNotification(userId, deviceTokens = null) {
    return await this.sendNotification(
      userId,
      'Welcome!',
      'Thanks for joining our app!',
      { type: 'welcome' },
      deviceTokens
    );
  }

  /**
   * Send account activity notification
   */
  static async sendAccountActivityNotification(userId, activity, deviceTokens = null) {
    return await this.sendNotification(
      userId,
      'Account Activity',
      `Your account was ${activity}`,
      { type: 'account-activity', activity },
      deviceTokens
    );
  }

  /**
   * Send password reset notification
   */
  static async sendPasswordResetNotification(userId, deviceTokens = null) {
    return await this.sendNotification(
      userId,
      'Password Reset',
      'Your password has been reset successfully',
      { type: 'password-reset' },
      deviceTokens
    );
  }

  /**
   * Send email verification notification
   */
  static async sendEmailVerificationNotification(userId, deviceTokens = null) {
    return await this.sendNotification(
      userId,
      'Email Verified',
      'Your email has been verified successfully',
      { type: 'email-verified' },
      deviceTokens
    );
  }
}

module.exports = NotificationService;


