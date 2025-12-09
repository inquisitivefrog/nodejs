# Mobile App Server - Backend API

Express.js backend server with MongoDB, JWT authentication, and Passport.js.

## Running Tests

### Prerequisites
- MongoDB running locally on `localhost:27017` (or set `MONGODB_URI` environment variable)
- Node.js 20+

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

- `tests/auth.test.js` - Authentication endpoints (register, login, get me)
- `tests/users.test.js` - User management endpoints (admin only)
- `tests/health.test.js` - Health check endpoint
- `tests/models/user.test.js` - User model validation and methods
- `tests/helpers/testHelpers.js` - Test utilities and helpers
- `tests/setup.js` - Test environment setup

### Test Database

Tests use a separate test database (`mobileapp-test`) and automatically clean up after each test suite.


