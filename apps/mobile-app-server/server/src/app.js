require('dotenv').config();
const express = require('express');
const path = require('path');
const corsMiddleware = require('./config/cors');
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const passport = require('./config/passport');
const errorHandler = require('./middleware/errorHandler');
const loggerMiddleware = require('./middleware/logger');
const logger = require('./config/logger');
const sanitizeInput = require('./middleware/sanitize');
const { apiLimiter, authLimiter, passwordResetLimiter, userLimiter } = require('./middleware/rateLimiter');
const swaggerSetup = require('./config/swagger');

// Import routes
const v1Routes = require('./routes/index');
// Legacy routes (for backward compatibility - can be removed in future versions)
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/admin');

// Initialize Express app
const app = express();

// Connect to MongoDB (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  connectDB();
  // Initialize separate read/write connection pools (Phase 4: Advanced Scaling)
  // Note: Models will use default connection for now, but pools are available for future optimization
  const { getReadConnection, getWriteConnection } = require('./config/database-pools');
  getReadConnection().catch((err) => {
    console.error('[APP] Failed to initialize read connection pool:', err.message);
  });
  getWriteConnection().catch((err) => {
    console.error('[APP] Failed to initialize write connection pool:', err.message);
  });
  // Connect to Redis (skip in test environment)
  connectRedis();
  // Initialize Firebase Admin SDK for push notifications
  const { initializeFirebase } = require('./config/firebase');
  initializeFirebase();
}

// Middleware
app.use(corsMiddleware); // CORS with environment-specific configuration
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Input sanitization (protect against XSS and injection)
app.use(sanitizeInput);

// Request/Response logging (only in non-test environments to avoid test noise)
if (process.env.NODE_ENV !== 'test') {
  app.use(loggerMiddleware);
}

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger API Documentation
if (process.env.NODE_ENV !== 'test') {
  swaggerSetup(app);
  logger.info('Swagger documentation available at /api/docs');
}

// Initialize Passport
app.use(passport.initialize());

// Routes
app.get('/health', (req, res) => {
  const serverInstance = process.env.SERVER_INSTANCE || 'unknown';
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    serverInstance: serverInstance,
    timestamp: new Date().toISOString()
  });
});

// Versioned API routes (v1) with rate limiting
app.use('/api/v1', apiLimiter, v1Routes);

// Legacy routes (for backward compatibility) - with rate limiting
// These will be deprecated in future versions
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userLimiter, userRoutes);
app.use('/api/admin', userLimiter, adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  const serverInstance = process.env.SERVER_INSTANCE || 'unknown';
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, {
      serverInstance,
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
    });
  });
}

module.exports = app;

