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
      const activeTokens = await DeviceToken.getActiveTokensForUser(userId);
      tokensToUse = activeTokens.map((dt) => dt.token);
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


