# Test Environment Notes

## Running Tests

### Unit Tests Only (No Database Required)

Unit tests use mocks and don't require a database connection:

```bash
# From project root
cd server
npm test -- tests/unit

# Or set environment variable to skip DB setup
SKIP_DB_SETUP=true npm test -- tests/unit
```

### Integration Tests (Requires MongoDB)

Integration tests require a running MongoDB instance. **Important**: Use the correct Docker Compose file:

#### Option 1: Regular Docker Compose (Recommended for Tests)

```bash
# Start regular MongoDB replica set
docker compose up -d mongodb1 mongodb2 mongodb3 redis

# Run tests from host machine
cd server
npm test

# Or run tests inside container
docker compose exec server1 npm test
```

#### Option 2: Sharding Docker Compose (NOT for Tests)

The sharding setup uses different service names and is **not compatible** with the test setup:

- ❌ **Don't run tests in sharding containers** - they use different MongoDB service names
- ✅ Use regular `docker-compose.yml` for running tests
- ✅ Use `docker-compose.sharding.yml` only for sharding-specific operations

### Test Database Configuration

Tests automatically use:
- Database: `mobileapp-test`
- Connection: `mongodb://mongodb1:27017/mobileapp-test` (in Docker)
- Connection: `mongodb://localhost:27017/mobileapp-test` (local)

### Common Issues

#### Issue: `getaddrinfo ENOTFOUND mongodb1`

**Cause**: Running tests in sharding container or MongoDB not running

**Solution**:
1. Use regular `docker-compose.yml` for tests
2. Ensure MongoDB services are running: `docker compose ps`
3. Check network connectivity: `docker compose exec server1 ping mongodb1`

#### Issue: Tests Timeout

**Cause**: MongoDB connection issues

**Solution**:
1. Verify MongoDB is healthy: `docker compose ps`
2. Check MongoDB logs: `docker compose logs mongodb1`
3. Increase test timeout if needed: `jest --testTimeout=60000`

### Test Categories

1. **Unit Tests** (`tests/unit/`) - No database needed, use mocks
2. **Integration Tests** (`tests/integration/`) - Require MongoDB
3. **API Tests** (`tests/*.test.js`) - Require MongoDB and full app stack

### Running Specific Test Suites

```bash
# Unit tests only
npm test -- tests/unit

# Integration tests only  
npm test -- tests/integration

# Specific test file
npm test -- tests/auth.test.js

# With coverage
npm run test:coverage
```



