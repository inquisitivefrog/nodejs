/**
 * CORS Configuration
 * Environment-specific CORS settings with credentials support
 */

const cors = require('cors');

// Get allowed origins from environment or use defaults
const getAllowedOrigins = () => {
  if (process.env.CORS_ORIGINS) {
    return process.env.CORS_ORIGINS.split(',').map(origin => origin.trim());
  }

  // Default origins based on environment
  if (process.env.NODE_ENV === 'production') {
    return [
      'https://yourdomain.com',
      'https://www.yourdomain.com',
    ];
  }

  // Development/test defaults
  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173', // Vite default
    'http://localhost:8080',
  ];
};

// CORS options
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Server-Instance', 'X-Request-ID'],
  maxAge: 86400, // 24 hours
};

// Create CORS middleware
const corsMiddleware = cors(corsOptions);

module.exports = corsMiddleware;




