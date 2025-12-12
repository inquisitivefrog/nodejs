#!/usr/bin/env node

/**
 * Smart Test Runner
 * Automatically detects environment and runs appropriate tests
 */

const { execSync } = require('child_process');
const dns = require('dns').promises;
const net = require('net');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

/**
 * Check if a host is reachable
 */
async function checkHost(host, port = 27017, timeout = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const onError = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(false);
      }
    };

    const onConnect = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(true);
      }
    };

    socket.setTimeout(timeout);
    socket.once('error', onError);
    socket.once('timeout', onError);
    socket.once('connect', onConnect);
    socket.connect(port, host);
  });
}

/**
 * Check if MongoDB is available
 */
async function checkMongoDB() {
  logSection('🔍 Detecting Test Environment');

  // Check if we're in Docker
  const isDocker = process.env.HOSTNAME || process.env.DOCKER_ENV;
  const mongoHost = isDocker ? 'mongodb1' : 'localhost';
  const mongoPort = 27017;

  log(`Checking MongoDB at ${mongoHost}:${mongoPort}...`, 'blue');

  try {
    // First try DNS resolution
    try {
      await dns.lookup(mongoHost);
    } catch (err) {
      log(`  ❌ Host ${mongoHost} not found`, 'yellow');
      return false;
    }

    // Then try TCP connection
    const isReachable = await checkHost(mongoHost, mongoPort);
    
    if (isReachable) {
      log(`  ✅ MongoDB is reachable at ${mongoHost}:${mongoPort}`, 'green');
      return true;
    } else {
      log(`  ⚠️  MongoDB host found but not responding on port ${mongoPort}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`  ❌ Error checking MongoDB: ${error.message}`, 'yellow');
    return false;
  }
}

/**
 * Run tests
 */
function runTests(testType, args = []) {
  const fs = require('fs');
  const path = require('path');
  
  // Try to find jest in local node_modules
  let jestCmd = 'npx --yes jest';
  const jestBinPath = path.join(process.cwd(), 'node_modules', '.bin', 'jest');
  const jestLibPath = path.join(process.cwd(), 'node_modules', 'jest', 'bin', 'jest.js');
  
  if (fs.existsSync(jestBinPath)) {
    jestCmd = jestBinPath;
  } else if (fs.existsSync(jestLibPath)) {
    jestCmd = `node ${jestLibPath}`;
  }

  const jestArgs = [];

  if (testType === 'unit') {
    jestArgs.push('tests/unit');
    process.env.SKIP_DB_SETUP = 'true';
  } else if (testType === 'integration') {
    jestArgs.push('tests/integration');
  } else if (testType === 'all') {
    // Run all tests
  }

  // Add any additional args
  jestArgs.push(...args);

  // Build command - use node for direct path, or npx for package name
  let command;
  if (jestCmd.includes('node_modules')) {
    // Direct path - use node
    command = `NODE_OPTIONS="--max-old-space-size=4096" node ${jestCmd} ${jestArgs.join(' ')}`;
  } else {
    // npx command - ensure local modules are in path
    command = `NODE_OPTIONS="--max-old-space-size=4096" NODE_PATH="${process.cwd()}/node_modules:${process.cwd()}/node_modules/.bin" ${jestCmd} ${jestArgs.join(' ')}`;
  }
  
  logSection(`🧪 Running ${testType.toUpperCase()} Tests`);
  log(`Command: ${command}`, 'blue');
  console.log('');

  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Check for explicit test type flags
  if (args.includes('--unit') || args.includes('-u')) {
    logSection('📋 Running Unit Tests Only');
    const success = runTests('unit', args.filter(a => !['--unit', '-u'].includes(a)));
    process.exit(success ? 0 : 1);
    return;
  }

  if (args.includes('--integration') || args.includes('-i')) {
    logSection('📋 Running Integration Tests Only');
    const success = runTests('integration', args.filter(a => !['--integration', '-i'].includes(a)));
    process.exit(success ? 0 : 1);
    return;
  }

  if (args.includes('--all') || args.includes('-a')) {
    logSection('📋 Running All Tests');
    const success = runTests('all', args.filter(a => !['--all', '-a'].includes(a)));
    process.exit(success ? 0 : 1);
    return;
  }

  // Auto-detect mode
  const mongoAvailable = await checkMongoDB();

  if (mongoAvailable) {
    log('\n✅ MongoDB detected - Running ALL tests (unit + integration)', 'green');
    const success = runTests('all', args);
    process.exit(success ? 0 : 1);
  } else {
    log('\n⚠️  MongoDB not available - Running UNIT tests only', 'yellow');
    log('   (Integration tests require MongoDB connection)', 'yellow');
    log('\n   To run integration tests, ensure MongoDB is running:', 'blue');
    log('   - Regular setup: docker compose up -d mongodb1 mongodb2 mongodb3', 'blue');
    log('   - Or use: npm run test:integration', 'blue');
    console.log('');
    
    const success = runTests('unit', args);
    process.exit(success ? 0 : 1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { checkMongoDB, runTests };

