module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  verbose: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
  ],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  // Skip setup for isolated unit tests that use mocks only
  setupFiles: [],
  // Ensure tests run sequentially to avoid database connection issues
  maxWorkers: 1,
  // Note: We removed forceExit: true to allow proper cleanup
  // If tests hang, check that mongoose.disconnect() and redis.disconnect() are being called in afterAll
  // The cleanup in tests/setup.js should handle closing all connections
  // If you still see hanging, you can add --forceExit to the test script
  // but the proper solution is to ensure all connections are closed
  // Performance tests may take longer
  testTimeout: 30000, // 30 seconds for performance/load tests
  // Increase memory for tests that create many connections/mocks
  // This is a fallback - the real fix is proper cleanup in tests
  // Heap size is increased via --max-old-space-size in package.json scripts
};

