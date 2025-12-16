const { captureException } = require('../config/sentry');
const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  // Only log in development, not in test or production
  // In test, errors are expected and tested, so we suppress them
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Log error with Winston
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    status: err.status || 500,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Capture to Sentry (only for server errors, not validation/auth errors)
  // Skip Sentry for expected errors (4xx status codes)
  if (err.status >= 500 || !err.status) {
    captureException(err, {
      tags: {
        path: req.path,
        method: req.method,
        status: err.status || 500,
      },
      extra: {
        body: req.body,
        query: req.query,
        params: req.params,
        headers: {
          'user-agent': req.get ? req.get('user-agent') : undefined,
          'content-type': req.get ? req.get('content-type') : undefined,
        },
      },
      user: req.user ? { id: req.user.id, email: req.user.email } : undefined,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((error) => error.message);
    return res.status(400).json({ message: 'Validation error', errors: messages });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(400).json({ 
      message: `Duplicate ${field} value entered`,
      field: field
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  // Passport authentication errors
  if (err.name === 'AuthenticationError' || err.message === 'Unauthorized') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Default error
  res.status(err.status || 500).json({
    message: err.message || 'Server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;

