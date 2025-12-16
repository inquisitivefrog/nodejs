const EmailService = require('../../../src/services/email.service');
const { enqueueJob, QUEUE_NAMES } = require('../../../src/config/queue');

// Mock the queue module
jest.mock('../../../src/config/queue', () => ({
  enqueueJob: jest.fn(),
  QUEUE_NAMES: {
    EMAIL: 'email',
  },
}));

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendWelcomeEmail', () => {
    it('should enqueue welcome email job', async () => {
      const mockJob = { id: 'job-123' };
      enqueueJob.mockResolvedValue(mockJob);

      const user = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const job = await EmailService.sendWelcomeEmail(user);

      expect(enqueueJob).toHaveBeenCalledWith(
        QUEUE_NAMES.EMAIL,
        {
          to: user.email,
          subject: 'Welcome to Mobile App!',
          template: 'welcome',
          data: {
            name: user.name,
            email: user.email,
          },
        },
        {
          priority: 5,
        }
      );
      expect(job).toBe(mockJob);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should enqueue password reset email job', async () => {
      const mockJob = { id: 'job-456' };
      enqueueJob.mockResolvedValue(mockJob);

      const user = {
        email: 'test@example.com',
        name: 'Test User',
      };
      const resetToken = 'reset-token-123';

      const job = await EmailService.sendPasswordResetEmail(user, resetToken);

      expect(enqueueJob).toHaveBeenCalledWith(
        QUEUE_NAMES.EMAIL,
        {
          to: user.email,
          subject: 'Password Reset Request',
          template: 'password-reset',
          data: {
            name: user.name,
            resetToken,
            resetUrl: expect.stringContaining(resetToken),
          },
        },
        {
          priority: 8,
          attempts: 5,
        }
      );
      expect(job).toBe(mockJob);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should enqueue email verification job', async () => {
      const mockJob = { id: 'job-789' };
      enqueueJob.mockResolvedValue(mockJob);

      const user = {
        email: 'test@example.com',
        name: 'Test User',
      };
      const verificationToken = 'verify-token-123';

      const job = await EmailService.sendVerificationEmail(user, verificationToken);

      expect(enqueueJob).toHaveBeenCalledWith(
        QUEUE_NAMES.EMAIL,
        {
          to: user.email,
          subject: 'Verify Your Email',
          template: 'email-verification',
          data: {
            name: user.name,
            verificationToken,
            verificationUrl: expect.stringContaining(verificationToken),
          },
        },
        {
          priority: 5,
        }
      );
      expect(job).toBe(mockJob);
    });
  });
});





