const { Worker } = require('bullmq');
const { getBullMQRedisConnection } = require('../../config/redis');
const { QUEUE_NAMES } = require('../../config/queue');
const { sendPushNotification } = require('../../config/firebase');
const DeviceToken = require('../../models/DeviceToken');
const logger = require('../../config/logger');

/**
 * Push notification job processor
 * Processes push notification jobs using FCM
 */
const createNotificationWorker = () => {
  const redis = getBullMQRedisConnection();
  if (!redis) {
    return null;
  }

  const worker = new Worker(
    QUEUE_NAMES.NOTIFICATION,
    async (job) => {
      const { userId, title, body, data = {}, deviceTokens = [] } = job.data;

      logger.info(`[NOTIFICATION WORKER] Processing notification job ${job.id}: ${title} to user ${userId}`);

      try {
        // If deviceTokens are provided, use them; otherwise fetch from database
        let tokensToUse = deviceTokens;
        if (!tokensToUse || tokensToUse.length === 0) {
          // Fetch active device tokens for the user
          const activeTokens = await DeviceToken.getActiveTokensForUser(userId);
          tokensToUse = activeTokens.map((dt) => dt.token);
        }

        if (tokensToUse.length === 0) {
          logger.warn(`[NOTIFICATION WORKER] No device tokens found for user ${userId}`);
          return {
            success: false,
            userId,
            title,
            sentAt: new Date().toISOString(),
            devicesNotified: 0,
            error: 'No device tokens found',
          };
        }

        // Send push notification via FCM
        const result = await sendPushNotification(
          tokensToUse,
          { title, body },
          data
        );

        // Deactivate failed tokens (invalid tokens)
        if (result.failedTokens && result.failedTokens.length > 0) {
          for (const failedToken of result.failedTokens) {
            // Only deactivate if it's an invalid token error
            if (
              failedToken.error === 'messaging/invalid-registration-token' ||
              failedToken.error === 'messaging/registration-token-not-registered'
            ) {
              await DeviceToken.deactivateToken(failedToken.token);
              logger.info(`[NOTIFICATION WORKER] Deactivated invalid token: ${failedToken.token.substring(0, 20)}...`);
            }
          }
        }

        // Update last used timestamp for successful tokens
        if (result.success && tokensToUse.length > 0) {
          for (const token of tokensToUse) {
            await DeviceToken.updateLastUsed(token).catch((err) => {
              // Ignore errors updating last used
              logger.debug(`[NOTIFICATION WORKER] Failed to update last used for token: ${err.message}`);
            });
          }
        }

        logger.info(
          `[NOTIFICATION WORKER] Notification sent: ${result.successCount} successful, ${result.failureCount} failed`
        );

        return {
          success: result.success,
          userId,
          title,
          sentAt: new Date().toISOString(),
          devicesNotified: result.successCount || 0,
          devicesFailed: result.failureCount || 0,
        };
      } catch (error) {
        logger.error(`[NOTIFICATION WORKER] Error processing notification job ${job.id}:`, error.message);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 10, // Process up to 10 notifications concurrently
    }
  );

  worker.on('completed', (job) => {
    logger.info(`[NOTIFICATION WORKER] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[NOTIFICATION WORKER] Job ${job.id} failed:`, err.message);
  });

  return worker;
};

module.exports = {
  createNotificationWorker,
};

