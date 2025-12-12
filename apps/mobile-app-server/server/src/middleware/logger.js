/**
 * Request/Response Logging Middleware
 * Uses Winston logger for structured logging
 */

const logger = require('../config/logger');
const crypto = require('crypto');

/**
 * Request/Response logging middleware
 * Logs request details and response status
 */
const requestLogger = (req, res, next) => {
  // Generate request ID for tracking
  const requestId = crypto.randomBytes(16).toString('hex');
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const startTime = Date.now();
  const { method, path, query, body, ip } = req;
  const userAgent = req.get('user-agent') || 'unknown';

  // Log request
  logger.info('Incoming request', {
    requestId,
    method,
    path,
    query,
    ip,
    userAgent,
    // Don't log sensitive data
    body: sanitizeBody(body),
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;
    const { statusCode } = res;

    // Log response
    logger.info('Outgoing response', {
      requestId,
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      // Log as error if status >= 400
      level: statusCode >= 400 ? 'error' : 'info',
    });

    // Call original send
    originalSend.call(this, data);
  };

  next();
};

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'refreshToken', 'accessToken', 'secret', 'apiKey'];

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

module.exports = requestLogger;

