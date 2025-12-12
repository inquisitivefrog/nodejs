const { enqueueJob, QUEUE_NAMES } = require('../config/queue');

/**
 * Analytics service - enqueues analytics events for async processing
 */
class AnalyticsService {
  /**
   * Log user event
   */
  static async logEvent(event, userId, metadata = {}) {
    return await enqueueJob(
      QUEUE_NAMES.ANALYTICS,
      {
        event,
        userId,
        metadata,
        timestamp: new Date().toISOString(),
      },
      {
        priority: 1, // Low priority - analytics can be delayed
        attempts: 1, // Don't retry analytics - if it fails, it's okay
      }
    );
  }

  /**
   * Log user registration
   */
  static async logUserRegistration(userId, metadata = {}) {
    return await this.logEvent('user.registered', userId, metadata);
  }

  /**
   * Log user login
   */
  static async logUserLogin(userId, metadata = {}) {
    return await this.logEvent('user.login', userId, metadata);
  }

  /**
   * Log user action
   */
  static async logUserAction(userId, action, metadata = {}) {
    return await this.logEvent(`user.action.${action}`, userId, metadata);
  }
}

module.exports = AnalyticsService;


