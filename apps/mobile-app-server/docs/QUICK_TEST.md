# Quick Test Commands

## ✅ Unit Tests (No Database Required)

Unit tests use mocks and **don't need MongoDB**. These are passing! 🎉

```bash
# Run unit tests only (works in any environment)
npm run test:unit

# Or from inside any container
SKIP_DB_SETUP=true npm test -- tests/unit
```

## ⚠️ Integration Tests (Require MongoDB)

Integration tests **need MongoDB** and must run in the correct Docker network:

### Option 1: Use Regular Docker Compose

```bash
# Exit sharding container first
exit

# Start regular MongoDB setup
docker compose up -d mongodb1 mongodb2 mongodb3 redis

# Run integration tests
docker compose exec server1 npm run test:integration
```

### Option 2: Run from Host Machine

```bash
# From project root
cd server
npm run test:integration
```

## Current Status

✅ **Unit Tests**: All passing (17 tests)
- ✅ Register
- ✅ Login  
- ✅ GetMe
- ✅ RefreshToken
- ✅ ForgotPassword
- ✅ ResetPassword
- ✅ VerifyEmail
- ✅ ResendVerification

⚠️ **Integration Tests**: Need MongoDB connection
- These require the regular `docker-compose.yml` setup
- Cannot run in sharding container (different network)

## Quick Fix for Sharding Container

If you're in the sharding container and want to test:

```bash
# Run unit tests only (no DB needed)
npm run test:unit
```

This will skip all integration tests that require MongoDB.

