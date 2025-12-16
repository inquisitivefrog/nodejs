# Smart Test Runner

## Overview

The smart test runner automatically detects your environment and runs the appropriate tests:

- ✅ **MongoDB available** → Runs all tests (unit + integration)
- ⚠️ **MongoDB not available** → Runs unit tests only

## Usage

### Automatic Detection (Recommended)

```bash
npm test
```

The script will:
1. Check if MongoDB is reachable
2. Run all tests if MongoDB is available
3. Run only unit tests if MongoDB is not available

### Manual Override

You can also explicitly specify what to run:

```bash
# Unit tests only (no MongoDB needed)
npm run test:unit
# or
npm test -- --unit

# Integration tests only (requires MongoDB)
npm run test:integration
# or
npm test -- --integration

# All tests (requires MongoDB)
npm run test:all
# or
npm test -- --all
```

## How It Works

1. **Environment Detection**: Checks if running in Docker or locally
2. **MongoDB Check**: Attempts to connect to MongoDB (mongodb1:27017 in Docker, localhost:27017 locally)
3. **Smart Execution**: 
   - If MongoDB is available → runs all tests
   - If MongoDB is not available → runs unit tests only with helpful message

## Examples

### In Sharding Container (No MongoDB)

```bash
$ npm test

============================================================
🔍 Detecting Test Environment
============================================================

Checking MongoDB at mongodb1:27017...
  ❌ Host mongodb1 not found

⚠️  MongoDB not available - Running UNIT tests only
   (Integration tests require MongoDB connection)

   To run integration tests, ensure MongoDB is running:
   - Regular setup: docker compose up -d mongodb1 mongodb2 mongodb3
   - Or use: npm run test:integration

============================================================
🧪 Running UNIT Tests
============================================================
...
```

### In Regular Container (MongoDB Available)

```bash
$ npm test

============================================================
🔍 Detecting Test Environment
============================================================

Checking MongoDB at mongodb1:27017...
  ✅ MongoDB is reachable at mongodb1:27017

✅ MongoDB detected - Running ALL tests (unit + integration)

============================================================
🧪 Running ALL Tests
============================================================
...
```

## Benefits

- ✅ **No manual configuration** - Works in any environment
- ✅ **Clear feedback** - Shows what's being detected and run
- ✅ **Flexible** - Can override with flags if needed
- ✅ **Fast** - Skips MongoDB checks when explicitly told what to run

## Test Scripts Reference

| Command | Description | MongoDB Required |
|---------|-------------|------------------|
| `npm test` | Smart auto-detection | Auto-detected |
| `npm run test:unit` | Unit tests only | ❌ No |
| `npm run test:integration` | Integration tests only | ✅ Yes |
| `npm run test:all` | All tests | ✅ Yes |
| `npm run test:watch` | Watch mode | ✅ Yes |
| `npm run test:coverage` | With coverage | ✅ Yes |
| `npm run test:performance` | Performance tests | ✅ Yes |




