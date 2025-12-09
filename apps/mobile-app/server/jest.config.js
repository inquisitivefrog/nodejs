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
  // Ensure tests run sequentially to avoid database connection issues
  maxWorkers: 1,
  // Force exit after tests to prevent hanging
  // This is safe because we properly clean up in afterAll
  forceExit: true,
};

