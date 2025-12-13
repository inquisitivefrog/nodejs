const admin = require('firebase-admin');
const logger = require('./logger');

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 * Supports both service account JSON and environment variables
 */
const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Option 1: Service account JSON file path
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      logger.info('Firebase Admin initialized from service account file');
      return firebaseApp;
    }

    // Option 2: Service account JSON as environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      logger.info('Firebase Admin initialized from environment variable');
      return firebaseApp;
    }

    // Option 3: Individual environment variables
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL
    ) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
      logger.info('Firebase Admin initialized from environment variables');
      return firebaseApp;
    }

    // In test mode or if Firebase is not configured, return null
    if (process.env.NODE_ENV === 'test') {
      logger.warn('Firebase Admin not initialized - test mode');
      return null;
    }

    logger.warn(
      'Firebase Admin not initialized - missing configuration. Push notifications will not work.'
    );
    logger.warn(
      'Set FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_SERVICE_ACCOUNT, or FIREBASE_PROJECT_ID/PRIVATE_KEY/CLIENT_EMAIL'
    );
    return null;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin:', error.message);
    return null;
  }
};

/**
 * Get Firebase Admin instance
 */
const getFirebaseApp = () => {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
};

/**
 * Send push notification via FCM
 */
const sendPushNotification = async (deviceTokens, notification, data = {}) => {
  const app = getFirebaseApp();
  if (!app) {
    logger.warn('Firebase not initialized - skipping push notification');
    return { success: false, error: 'Firebase not initialized' };
  }

  try {
    // Filter out invalid tokens
    const validTokens = Array.isArray(deviceTokens)
      ? deviceTokens.filter((token) => token && typeof token === 'string')
      : [];

    if (validTokens.length === 0) {
      logger.warn('No valid device tokens provided');
      return { success: false, error: 'No valid device tokens' };
    }

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        // Convert all data values to strings (FCM requirement)
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);
          return acc;
        }, {}),
      },
      tokens: validTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // Log results
    const successCount = response.successCount;
    const failureCount = response.failureCount;

    logger.info(`Push notification sent: ${successCount} successful, ${failureCount} failed`);

    // Handle failed tokens (invalid tokens should be removed)
    const failedTokens = [];
    if (response.responses) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push({
            token: validTokens[idx],
            error: resp.error?.code || 'unknown',
          });
        }
      });
    }

    return {
      success: successCount > 0,
      successCount,
      failureCount,
      failedTokens,
    };
  } catch (error) {
    logger.error('Error sending push notification:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  initializeFirebase,
  getFirebaseApp,
  sendPushNotification,
};

