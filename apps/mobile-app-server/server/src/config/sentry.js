const logger = require('./logger');

// Optional Sentry integration - only load if packages are installed
let Sentry = null;
let ProfilingIntegration = null;

try {
  Sentry = require('@sentry/node');
  ProfilingIntegration = require('@sentry/profiling-node').ProfilingIntegration;
} catch (error) {
  // Sentry packages not installed - that's okay, it's optional
  logger.debug('Sentry packages not available, error tracking will be disabled');
}

/**
 * Initialize Sentry error tracking
 * Only initializes if SENTRY_DSN is provided
 */
function initializeSentry() {
  // Check if Sentry is available
  if (!Sentry) {
    logger.info('Sentry packages not installed, error tracking disabled');
    return;
  }

  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';
  const serverInstance = process.env.SERVER_INSTANCE || 'unknown';

  if (!dsn) {
    logger.info('Sentry DSN not provided, error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment,
      integrations: [
        // Enable HTTP tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable Express integration
        new Sentry.Integrations.Express(),
        // Enable profiling (optional, requires @sentry/profiling-node)
        ...(process.env.SENTRY_ENABLE_PROFILING === 'true' 
          ? [new ProfilingIntegration()] 
          : []),
      ],
      // Performance Monitoring
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'), // 10% of transactions
      // Profiling sample rate (if enabled)
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
      // Release tracking
      release: process.env.SENTRY_RELEASE || undefined,
      // Server instance as tag
      initialScope: {
        tags: {
          server_instance: serverInstance,
        },
      },
      // Filter out health check endpoints from performance monitoring
      beforeSend(event, hint) {
        // Don't send health check errors
        if (event.request?.url?.includes('/health')) {
          return null;
        }
        return event;
      },
      // Filter out certain errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        // Network errors
        'NetworkError',
        'Network request failed',
        // Validation errors (already handled)
        'ValidationError',
        // JWT errors (expected)
        'JsonWebTokenError',
        'TokenExpiredError',
      ],
    });

    logger.info('Sentry error tracking initialized', {
      environment,
      serverInstance,
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
    });
  } catch (error) {
    logger.error('Failed to initialize Sentry:', error);
  }
}

/**
 * Capture exception to Sentry
 */
function captureException(error, context = {}) {
  if (!Sentry || !process.env.SENTRY_DSN) {
    return;
  }

  Sentry.withScope((scope) => {
    // Add context
    if (context.user) {
      scope.setUser({ id: context.user.id, email: context.user.email });
    }
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    Sentry.captureException(error);
  });
}

/**
 * Capture message to Sentry
 */
function captureMessage(message, level = 'info', context = {}) {
  if (!Sentry || !process.env.SENTRY_DSN) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context.user) {
      scope.setUser({ id: context.user.id, email: context.user.email });
    }
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    Sentry.captureMessage(message, level);
  });
}

module.exports = {
  initializeSentry,
  captureException,
  captureMessage,
  Sentry,
};

