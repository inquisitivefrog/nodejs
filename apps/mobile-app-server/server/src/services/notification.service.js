const { enqueueJob, QUEUE_NAMES } = require('../config/queue');

/**
 * Push notification service - enqueues notification jobs for async processing
 */
class NotificationService {
  /**
   * Send push notification to user
   */
  static async sendNotification(userId, title, body, data = {}, deviceTokens = []) {
    return await enqueueJob(
      QUEUE_NAMES.NOTIFICATION,
      {
        userId,
        title,
        body,
        data,
        deviceTokens,
      },
      {
        priority: 5,
      }
    );
  }

  /**
   * Send welcome notification to new user
   */
  static async sendWelcomeNotification(userId, deviceTokens = []) {
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
  static async sendAccountActivityNotification(userId, activity, deviceTokens = []) {
    return await this.sendNotification(
      userId,
      'Account Activity',
      `Your account was ${activity}`,
      { type: 'account-activity', activity },
      deviceTokens
    );
  }
}

module.exports = NotificationService;


