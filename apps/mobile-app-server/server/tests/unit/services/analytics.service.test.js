const AnalyticsService = require('../../../src/services/analytics.service');
const { enqueueJob, QUEUE_NAMES } = require('../../../src/config/queue');

// Mock the queue module
jest.mock('../../../src/config/queue', () => ({
  enqueueJob: jest.fn(),
  QUEUE_NAMES: {
    ANALYTICS: 'analytics',
  },
}));

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logEvent', () => {
    it('should enqueue analytics event job', async () => {
      const mockJob = { id: 'job-123' };
      enqueueJob.mockResolvedValue(mockJob);

      const job = await AnalyticsService.logEvent('test.event', 'user-123', { key: 'value' });

      expect(enqueueJob).toHaveBeenCalledWith(
        QUEUE_NAMES.ANALYTICS,
        {
          event: 'test.event',
          userId: 'user-123',
          metadata: { key: 'value' },
          timestamp: expect.any(String),
        },
        {
          priority: 1,
          attempts: 1,
        }
      );
      expect(job).toBe(mockJob);
    });
  });

  describe('logUserRegistration', () => {
    it('should enqueue user registration event', async () => {
      const mockJob = { id: 'job-456' };
      enqueueJob.mockResolvedValue(mockJob);

      const job = await AnalyticsService.logUserRegistration('user-123', { email: 'test@example.com' });

      expect(enqueueJob).toHaveBeenCalledWith(
        QUEUE_NAMES.ANALYTICS,
        {
          event: 'user.registered',
          userId: 'user-123',
          metadata: { email: 'test@example.com' },
          timestamp: expect.any(String),
        },
        {
          priority: 1,
          attempts: 1,
        }
      );
      expect(job).toBe(mockJob);
    });
  });

  describe('logUserLogin', () => {
    it('should enqueue user login event', async () => {
      const mockJob = { id: 'job-789' };
      enqueueJob.mockResolvedValue(mockJob);

      const job = await AnalyticsService.logUserLogin('user-123', { method: 'email' });

      expect(enqueueJob).toHaveBeenCalledWith(
        QUEUE_NAMES.ANALYTICS,
        {
          event: 'user.login',
          userId: 'user-123',
          metadata: { method: 'email' },
          timestamp: expect.any(String),
        },
        {
          priority: 1,
          attempts: 1,
        }
      );
      expect(job).toBe(mockJob);
    });
  });

  describe('logUserAction', () => {
    it('should enqueue user action event', async () => {
      const mockJob = { id: 'job-abc' };
      enqueueJob.mockResolvedValue(mockJob);

      const job = await AnalyticsService.logUserAction('user-123', 'update', { field: 'name' });

      expect(enqueueJob).toHaveBeenCalledWith(
        QUEUE_NAMES.ANALYTICS,
        {
          event: 'user.action.update',
          userId: 'user-123',
          metadata: { field: 'name' },
          timestamp: expect.any(String),
        },
        {
          priority: 1,
          attempts: 1,
        }
      );
      expect(job).toBe(mockJob);
    });
  });
});




