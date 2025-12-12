# Test Suite Documentation

## Overview

This test suite provides comprehensive coverage for the mobile app server backend, including unit tests, integration tests, and performance tests.

## Test Structure

```
tests/
├── unit/                    # Unit tests (isolated components)
│   ├── controllers/
│   ├── middleware/
│   │   └── cache.test.js    # Cache middleware tests
│   └── config/
│       └── redis.test.js    # Redis configuration tests
├── integration/             # Integration tests
│   ├── cache.integration.test.js  # Cache integration tests
│   ├── pools.integration.test.js  # Connection pool integration tests
│   ├── mongodb-replica-set.test.js  # MongoDB replica set specific tests
│   ├── mongodb-schema-identity.test.js  # MongoDB schema and identity tests
│   └── mongodb-authentication.test.js  # MongoDB authentication and admin users tests
├── performance/             # Performance and load tests
├── helpers/                 # Test utilities
├── setup.js                 # Test environment setup
└── *.test.js                # Other integration tests
```

## MongoDB Authentication Tests (`tests/integration/mongodb-authentication.test.js`)

Datastore-specific tests that verify MongoDB's built-in authentication system:

- **MongoDB Authentication Status**:
  - Verifies MongoDB connection is established
  - Checks if authentication is enabled
  - Verifies ability to query admin database

- **Admin Database Users**:
  - Verifies admin database users exist (if authentication enabled)
  - Checks for root/admin user existence
  - Verifies application database user exists
  - Lists available MongoDB users and their roles

- **User Roles and Permissions**:
  - Verifies user roles are properly configured
  - Checks for readWrite role on application database
  - Validates role structure and permissions

- **Authentication Credentials**:
  - Verifies connection string format supports authentication
  - Checks authSource parameter is set correctly
  - Validates credential format in connection string

- **Replica Set Authentication**:
  - Verifies replica set members can authenticate
  - Checks internal authentication configuration
  - Validates authentication across replica set members

- **Security Best Practices**:
  - Verifies authentication is recommended for production
  - Ensures credentials are not exposed in logs
  - Validates security configuration

## MongoDB Schema and Identity Tests (`tests/integration/mongodb-schema-identity.test.js`)

Datastore-specific tests that verify MongoDB schema validation and identity/ObjectId handling:

- **Schema Field Types and Constraints**:
  - Enforces correct field types (String, Boolean, etc.)
  - Validates enum values for role field
  - Enforces minimum length constraints
  - Trims whitespace from fields
  - Lowercases email field

- **Schema Validation Rules**:
  - Validates email format with regex
  - Requires all required fields
  - Applies default values for optional fields
  - Rejects invalid data types

- **Indexes and Uniqueness**:
  - Verifies unique index on email field
  - Enforces unique email constraint at database level
  - Verifies automatic _id index
  - Tests index usage in queries

- **ObjectId Identity Handling**:
  - Auto-generates ObjectId for _id field
  - Validates ObjectId format (24 hex characters)
  - Handles ObjectId conversion to/from string
  - Rejects invalid ObjectId format in queries
  - Handles ObjectId equality correctly
  - Generates unique ObjectIds for different documents
  - Handles ObjectId in query filters and JSON serialization

- **Timestamps**:
  - Auto-generates createdAt timestamp
  - Auto-generates updatedAt timestamp
  - Updates updatedAt on document modification
  - Includes timestamps in JSON output

- **Schema Methods and Virtuals**:
  - Excludes password from JSON output
  - Provides comparePassword method
  - Tests password selection behavior

## MongoDB Replica Set Tests (`tests/integration/mongodb-replica-set.test.js`)

Datastore-specific tests that verify MongoDB replica set behavior and features:

- **Replica Set Connection**:
  - Connects to replica set with multiple hosts
  - Verifies connection string format includes replica set configuration
  - Verifies connection host information

- **Read Preference Behavior**:
  - Configures read preference for read pool (secondaryPreferred in production)
  - Uses primary read preference for write pool
  - Verifies read operations work correctly

- **Write Concern Behavior**:
  - Uses majority write concern (w: 'majority') for write operations
  - Handles concurrent writes correctly
  - Ensures data is written to majority of replica set members

- **Connection Pool Behavior**:
  - Maintains separate read and write connection pools
  - Reuses connections within pools
  - Handles connection pool exhaustion gracefully

- **Data Consistency**:
  - Ensures read-after-write consistency
  - Handles updates with write concern
  - Verifies data propagation in replica set

- **Error Handling**:
  - Handles connection errors gracefully
  - Handles write errors with proper error messages
  - Tests duplicate key errors

## New Tests for Phase 4 (Advanced Scaling - Connection Pools)

### Database Pool Helper Tests (`tests/unit/utils/db-helper.test.js`)

Tests for the database helper utilities that manage read/write connection pools:

- **Read Model Helper**:
  - Returns User model from read connection pool
  - Reuses read connection on subsequent calls
  - Falls back to default User model if read pool unavailable
  - Handles connection failures gracefully

- **Write Model Helper**:
  - Returns User model from write connection pool
  - Reuses write connection on subsequent calls
  - Falls back to default User model if write pool unavailable
  - Handles connection failures gracefully

- **Pool Separation**:
  - Verifies read and write pools are separate connections
  - Ensures models from different pools are distinct instances

### Database Pool Configuration Tests

**Note**: Unit tests for `database-pools.js` are skipped due to memory leak issues with Jest when testing modules that create event listeners. The functionality is thoroughly tested via integration tests.

**Unit Test Status**: `tests/unit/config/database-pools.test.js` is skipped - see integration tests below.

### Connection Pool Integration Tests (`tests/integration/pools.integration.test.js`)

Integration tests that verify connection pools are used correctly in API operations:

- **Pool Statistics Endpoint**:
  - Returns pool statistics for admin users
  - Denies access to non-admin users
  - Verifies both read and write pools are connected

- **Read Operations**:
  - GET `/api/auth/me` uses read pool
  - GET `/api/users` (admin) uses read pool
  - GET `/api/users/:id` (admin) uses read pool

- **Write Operations**:
  - POST `/api/auth/register` uses write pool
  - PUT `/api/users/:id` (admin) uses write pool
  - DELETE `/api/users/:id` (admin) uses write pool

- **Pool Connection Verification**:
  - Both read and write pools are connected
  - Read and write pools are separate connections
  - Models use correct pools for their operations

- **Pool Fallback Behavior**:
  - System handles pool unavailability gracefully
  - Falls back to default connection when pools fail

### User Model Pool Support Tests (`tests/models/user.test.js`)

Additional tests for the User model's `getUserModel` function:

- **getUserModel Function**:
  - Returns User model for default connection when no connection provided
  - Returns User model for a specific connection
  - Reuses existing model if it exists on connection

## New Tests for Phase 2 (Read Optimization)

### Cache Middleware Tests (`tests/unit/middleware/cache.test.js`)

Tests for the Redis caching middleware:

- **Cache Behavior**:
  - Skips caching in test environment
  - Skips caching for non-GET requests
  - Returns cached response on cache hit
  - Caches response on cache miss
  - Uses custom cache key generators

- **Cache Management**:
  - Cache invalidation by pattern
  - Clear all cache
  - Error handling when Redis is unavailable

### Redis Configuration Tests (`tests/unit/config/redis.test.js`)

Tests for Redis connection and configuration:

- **Connection Management**:
  - Creates Redis client with default/custom URL
  - Sets up event handlers
  - Returns existing client if already connected
  - Implements retry strategy

- **Client Lifecycle**:
  - Gets Redis client (creates if needed)
  - Disconnects Redis client gracefully
  - Handles errors during disconnect

### Cache Integration Tests (`tests/integration/cache.integration.test.js`)

Integration tests for cache functionality:

- **Cache Invalidation**:
  - Invalidates user list cache on user update
  - Invalidates user cache on user delete
  - Invalidates user list cache on user registration

- **Read Preferences**:
  - Uses primary read preference in test environment
  - Verifies read preference configuration

- **Error Handling**:
  - Handles cache operations gracefully when Redis unavailable

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Cache-related tests
npm test -- tests/unit/middleware/cache.test.js
npm test -- tests/unit/config/redis.test.js
npm test -- tests/integration/cache.integration.test.js

# Connection pool tests
npm test -- tests/unit/utils/db-helper.test.js
npm test -- tests/unit/config/database-pools.test.js
npm test -- tests/integration/pools.integration.test.js

# MongoDB replica set tests
npm test -- tests/integration/mongodb-replica-set.test.js

# MongoDB schema and identity tests
npm test -- tests/integration/mongodb-schema-identity.test.js

# MongoDB authentication tests
npm test -- tests/integration/mongodb-authentication.test.js

# Performance tests
npm run test:performance
```

### Run with Coverage
```bash
npm run test:coverage
```

## Test Environment

- **Database**: Uses `mobileapp-test` database
- **Redis**: Caching is disabled in test environment (NODE_ENV=test)
- **MongoDB**: Connects to single node (mongodb1) for tests
- **Read Preference**: Uses 'primary' in test environment (pools use primary in test mode)
- **Connection Pools**: Read and write pools are initialized but use primary in test environment
- **Memory**: Tests run with increased heap size (4GB) via `--max-old-space-size=4096` to handle connection pool tests and large test suites

## Notes

- Cache middleware automatically skips caching when `NODE_ENV=test`
- Redis connection is mocked in unit tests
- Integration tests verify cache invalidation logic without requiring Redis
- All tests clean up after themselves (database, Redis connections)


