const { enqueueJob, QUEUE_NAMES } = require('../config/queue');

/**
 * Email service - enqueues email jobs for async processing
 */
class EmailService {
  /**
   * Send welcome email to new user
   */
  static async sendWelcomeEmail(user) {
    return await enqueueJob(
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
        priority: 5, // Normal priority
      }
    );
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(user, resetToken) {
    return await enqueueJob(
      QUEUE_NAMES.EMAIL,
      {
        to: user.email,
        subject: 'Password Reset Request',
        template: 'password-reset',
        data: {
          name: user.name,
          resetToken,
          resetUrl: `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`,
        },
      },
      {
        priority: 8, // High priority
        attempts: 5, // More attempts for important emails
      }
    );
  }

  /**
   * Send email verification email
   */
  static async sendVerificationEmail(user, verificationToken) {
    return await enqueueJob(
      QUEUE_NAMES.EMAIL,
      {
        to: user.email,
        subject: 'Verify Your Email',
        template: 'email-verification',
        data: {
          name: user.name,
          verificationToken,
          verificationUrl: `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`,
        },
      },
      {
        priority: 5,
      }
    );
  }
}

module.exports = EmailService;





