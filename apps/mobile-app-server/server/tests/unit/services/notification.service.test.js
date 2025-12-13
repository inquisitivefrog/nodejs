const NotificationService = require('../../../src/services/notification.service');
const DeviceToken = require('../../../src/models/DeviceToken');
const { enqueueJob, QUEUE_NAMES } = require('../../../src/config/queue');

// Mock the queue
jest.mock('../../../src/config/queue', () => ({
  enqueueJob: jest.fn(),
  QUEUE_NAMES: {
    NOTIFICATION: 'notification',
  },
}));

// Mock DeviceToken model
jest.mock('../../../src/models/DeviceToken', () => ({
  getActiveTokensForUser: jest.fn(),
}));

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('should enqueue notification job with provided device tokens', async () => {
      const deviceTokens = ['token1', 'token2'];
      const result = await NotificationService.sendNotification(
        'user123',
        'Test Title',
        'Test Body',
        { type: 'test' },
        deviceTokens
      );

      expect(enqueueJob).toHaveBeenCalledWith(
        QUEUE_NAMES.NOTIFICATION,
        {
          userId: 'user123',
          title: 'Test Title',
          body: 'Test Body',
          data: { type: 'test' },
          deviceTokens: ['token1', 'token2'],
        },
        { priority: 5 }
      );
    });

    it('should fetch device tokens from database if not provided', async () => {
      DeviceToken.getActiveTokensForUser.mockResolvedValue([
        { token: 'db-token-1', platform: 'ios' },
        { token: 'db-token-2', platform: 'android' },
      ]);

      await NotificationService.sendNotification('user123', 'Test Title', 'Test Body');

      expect(DeviceToken.getActiveTokensForUser).toHaveBeenCalledWith('user123');
      expect(enqueueJob).toHaveBeenCalledWith(
        QUEUE_NAMES.NOTIFICATION,
        expect.objectContaining({
          deviceTokens: ['db-token-1', 'db-token-2'],
        }),
        { priority: 5 }
      );
    });

    it('should use empty array if no device tokens found', async () => {
      DeviceToken.getActiveTokensForUser.mockResolvedValue([]);

      await NotificationService.sendNotification('user123', 'Test Title', 'Test Body');

      expect(enqueueJob).toHaveBeenCalledWith(
        QUEUE_NAMES.NOTIFICATION,
        expect.objectContaining({
          deviceTokens: [],
        }),
        { priority: 5 }
      );
    });
  });

  describe('sendWelcomeNotification', () => {
    it('should send welcome notification', async () => {
      await NotificationService.sendWelcomeNotification('user123', ['token1']);

      expect(enqueueJob).toHaveBeenCalledWith(
        QUEUE_NAMES.NOTIFICATION,
        expect.objectContaining({
          userId: 'user123',
          title: 'Welcome!',
          body: 'Thanks for joining our app!',
          data: { type: 'welcome' },
          deviceTokens: ['token1'],
        }),
        { priority: 5 }
      );
    });
  });

  describe('sendAccountActivityNotification', () => {
    it('should send account activity notification', async () => {
      await NotificationService.sendAccountActivityNotification('user123', 'activated');

      expect(enqueueJob).toHaveBeenCalledWith(
        QUEUE_NAMES.NOTIFICATION,
        expect.objectContaining({
          userId: 'user123',
          title: 'Account Activity',
          body: 'Your account was activated',
          data: { type: 'account-activity', activity: 'activated' },
        }),
        { priority: 5 }
      );
    });
  });

  describe('sendPasswordResetNotification', () => {
    it('should send password reset notification', async () => {
      await NotificationService.sendPasswordResetNotification('user123');

      expect(enqueueJob).toHaveBeenCalledWith(
        QUEUE_NAMES.NOTIFICATION,
        expect.objectContaining({
          userId: 'user123',
          title: 'Password Reset',
          body: 'Your password has been reset successfully',
          data: { type: 'password-reset' },
        }),
        { priority: 5 }
      );
    });
  });

  describe('sendEmailVerificationNotification', () => {
    it('should send email verification notification', async () => {
      await NotificationService.sendEmailVerificationNotification('user123');

      expect(enqueueJob).toHaveBeenCalledWith(
        QUEUE_NAMES.NOTIFICATION,
        expect.objectContaining({
          userId: 'user123',
          title: 'Email Verified',
          body: 'Your email has been verified successfully',
          data: { type: 'email-verified' },
        }),
        { priority: 5 }
      );
    });
  });
});

