#!/usr/bin/env node

/**
 * Service Verification Script
 * Tests all running services to ensure they're working correctly
 */

const http = require('http');
const https = require('https');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const checkmarks = {
  pass: '✓',
  fail: '✗',
  warn: '⚠',
};

// Detect if running in Docker
// In Docker containers, NODE_ENV is typically 'production' and HOSTNAME is a container ID
// Also check if we're being executed via docker compose exec (which sets certain env vars)
const isDocker = (process.env.NODE_ENV === 'production' && 
                 process.env.HOSTNAME && 
                 !process.env.HOSTNAME.includes('localhost') &&
                 !process.env.HOSTNAME.includes('127.0.0.1')) ||
                 process.env.API_URL?.includes('loadbalancer');

// Determine API base URL - prefer env var, then Docker service name, then localhost
const apiBaseUrl = process.env.API_URL || (isDocker ? 'http://loadbalancer:80' : 'http://localhost:3000');

// Configuration - use Docker service names when inside container
const config = {
  api: {
    baseUrl: apiBaseUrl,
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      docs: '/api/docs',
      healthLive: '/health/live',
      healthReady: '/health/ready',
    },
  },
  prometheus: {
    baseUrl: process.env.PROMETHEUS_URL || (isDocker ? 'http://prometheus:9090' : 'http://localhost:9090'),
    endpoints: {
      targets: '/api/v1/targets',
      query: '/api/v1/query?query=mobile_app_http_requests_total',
    },
  },
  grafana: {
    baseUrl: process.env.GRAFANA_URL || (isDocker ? 'http://grafana:3000' : 'http://localhost:3001'),
    endpoints: {
      health: '/api/health',
      datasources: '/api/datasources',
    },
  },
  adminDashboard: {
    baseUrl: process.env.ADMIN_URL || (isDocker ? 'http://admin-dashboard:80' : 'http://localhost'),
  },
};

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 5000,
    };

    const req = protocol.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Test API Health Endpoint
 */
async function testApiHealth() {
  console.log(`\n${colors.cyan}Testing API Health Endpoint...${colors.reset}`);
  try {
    const response = await makeRequest(`${config.api.baseUrl}${config.api.endpoints.health}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      console.log(`  ${colors.green}${checkmarks.pass} Health endpoint: OK${colors.reset}`);
      console.log(`    Status: ${data.status || 'unknown'}`);
      console.log(`    Server Instance: ${data.server?.instance || 'unknown'}`);
      console.log(`    MongoDB: ${data.database?.mongodb?.status || 'unknown'}`);
      console.log(`    Redis: ${data.database?.redis?.status || 'unknown'}`);
      return { success: true, data };
    } else {
      console.log(`  ${colors.red}${checkmarks.fail} Health endpoint: Failed (${response.statusCode})${colors.reset}`);
      return { success: false, statusCode: response.statusCode };
    }
  } catch (error) {
    console.log(`  ${colors.red}${checkmarks.fail} Health endpoint: Error - ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test API Metrics Endpoint
 */
async function testApiMetrics() {
  console.log(`\n${colors.cyan}Testing API Metrics Endpoint...${colors.reset}`);
  try {
    const response = await makeRequest(`${config.api.baseUrl}${config.api.endpoints.metrics}`);
    
    if (response.statusCode === 200) {
      const metrics = response.body;
      const hasMetrics = metrics.includes('mobile_app_');
      const hasHttpMetrics = metrics.includes('mobile_app_http_requests_total');
      const hasSystemMetrics = metrics.includes('mobile_app_process_');
      
      console.log(`  ${colors.green}${checkmarks.pass} Metrics endpoint: OK${colors.reset}`);
      console.log(`    Format: Prometheus text format`);
      console.log(`    Has custom metrics: ${hasMetrics ? 'Yes' : 'No'}`);
      console.log(`    Has HTTP metrics: ${hasHttpMetrics ? 'Yes' : 'No'}`);
      console.log(`    Has system metrics: ${hasSystemMetrics ? 'Yes' : 'No'}`);
      
      // Count metric lines
      const metricLines = metrics.split('\n').filter(line => 
        line && !line.startsWith('#') && !line.trim() === ''
      ).length;
      console.log(`    Metric lines: ${metricLines}`);
      
      return { success: true, hasMetrics, metricCount: metricLines };
    } else {
      console.log(`  ${colors.yellow}${checkmarks.warn} Metrics endpoint: ${response.statusCode} (may be disabled in test mode)${colors.reset}`);
      return { success: false, statusCode: response.statusCode };
    }
  } catch (error) {
    console.log(`  ${colors.red}${checkmarks.fail} Metrics endpoint: Error - ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test API Documentation
 */
async function testApiDocs() {
  console.log(`\n${colors.cyan}Testing API Documentation...${colors.reset}`);
  try {
    const response = await makeRequest(`${config.api.baseUrl}${config.api.endpoints.docs}`);
    
    if (response.statusCode === 200 || response.statusCode === 301) {
      // 301 is a redirect (likely trailing slash), which is fine
      const hasSwagger = response.body.includes('swagger') || response.body.includes('Swagger');
      const status = response.statusCode === 301 ? 'Redirect (301)' : 'OK';
      console.log(`  ${colors.green}${checkmarks.pass} API Documentation: ${status}${colors.reset}`);
      console.log(`    Swagger UI: ${hasSwagger ? 'Available' : 'Not detected'}`);
      return { success: true };
    } else {
      console.log(`  ${colors.yellow}${checkmarks.warn} API Documentation: ${response.statusCode}${colors.reset}`);
      return { success: false, statusCode: response.statusCode };
    }
  } catch (error) {
    console.log(`  ${colors.red}${checkmarks.fail} API Documentation: Error - ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test Prometheus Targets
 */
async function testPrometheusTargets() {
  console.log(`\n${colors.cyan}Testing Prometheus Targets...${colors.reset}`);
  try {
    const response = await makeRequest(`${config.prometheus.baseUrl}${config.prometheus.endpoints.targets}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      const targets = data.data?.activeTargets || [];
      
      console.log(`  ${colors.green}${checkmarks.pass} Prometheus: OK${colors.reset}`);
      console.log(`    Total targets: ${targets.length}`);
      
      const upTargets = targets.filter(t => t.health === 'up');
      const downTargets = targets.filter(t => t.health === 'down');
      
      console.log(`    ${colors.green}UP: ${upTargets.length}${colors.reset}`);
      if (downTargets.length > 0) {
        console.log(`    ${colors.red}DOWN: ${downTargets.length}${colors.reset}`);
      }
      
      // Show target details
      targets.forEach((target) => {
        const status = target.health === 'up' ? colors.green : colors.red;
        const symbol = target.health === 'up' ? checkmarks.pass : checkmarks.fail;
        console.log(`      ${status}${symbol} ${target.job}: ${target.health}${colors.reset} (${target.scrapeUrl})`);
      });
      
      return { success: true, targets, upCount: upTargets.length, downCount: downTargets.length };
    } else {
      console.log(`  ${colors.red}${checkmarks.fail} Prometheus: Failed (${response.statusCode})${colors.reset}`);
      return { success: false, statusCode: response.statusCode };
    }
  } catch (error) {
    console.log(`  ${colors.red}${checkmarks.fail} Prometheus: Error - ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
    }
}

/**
 * Test Prometheus Query
 */
async function testPrometheusQuery() {
  console.log(`\n${colors.cyan}Testing Prometheus Query...${colors.reset}`);
  try {
    const response = await makeRequest(`${config.prometheus.baseUrl}${config.prometheus.endpoints.query}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      const results = data.data?.result || [];
      
      console.log(`  ${colors.green}${checkmarks.pass} Prometheus Query: OK${colors.reset}`);
      console.log(`    Query results: ${results.length}`);
      
      if (results.length > 0) {
        console.log(`    Metrics found: Yes`);
        results.slice(0, 3).forEach((result) => {
          console.log(`      - ${result.metric?.__name__ || 'unknown'}: ${result.value?.[1] || 'N/A'}`);
        });
      } else {
        console.log(`    ${colors.yellow}No metrics found yet (may need time to collect)${colors.reset}`);
      }
      
      return { success: true, resultCount: results.length };
    } else {
      console.log(`  ${colors.red}${checkmarks.fail} Prometheus Query: Failed (${response.statusCode})${colors.reset}`);
      return { success: false, statusCode: response.statusCode };
    }
  } catch (error) {
    console.log(`  ${colors.red}${checkmarks.fail} Prometheus Query: Error - ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test Grafana Health
 */
async function testGrafanaHealth() {
  console.log(`\n${colors.cyan}Testing Grafana...${colors.reset}`);
  try {
    const response = await makeRequest(`${config.grafana.baseUrl}${config.grafana.endpoints.health}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      console.log(`  ${colors.green}${checkmarks.pass} Grafana: OK${colors.reset}`);
      console.log(`    Status: ${data.commit || 'running'}`);
      console.log(`    Version: ${data.version || 'unknown'}`);
      return { success: true, data };
    } else {
      console.log(`  ${colors.yellow}${checkmarks.warn} Grafana Health: ${response.statusCode}${colors.reset}`);
      return { success: false, statusCode: response.statusCode };
    }
  } catch (error) {
    console.log(`  ${colors.red}${checkmarks.fail} Grafana: Error - ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test Grafana Datasources
 */
async function testGrafanaDatasources() {
  console.log(`\n${colors.cyan}Testing Grafana Datasources...${colors.reset}`);
  try {
    // Note: This requires authentication, so we'll just check if Grafana is accessible
    const response = await makeRequest(`${config.grafana.baseUrl}/api/health`, {
      timeout: 3000,
    });
    
    if (response.statusCode === 200) {
      console.log(`  ${colors.green}${checkmarks.pass} Grafana accessible${colors.reset}`);
      console.log(`    ${colors.yellow}Note: Datasource check requires login (admin/G1ng3rb33r)${colors.reset}`);
      console.log(`    Check manually at: ${config.grafana.baseUrl}`);
      return { success: true };
    } else {
      console.log(`  ${colors.yellow}${checkmarks.warn} Grafana: ${response.statusCode}${colors.reset}`);
      return { success: false, statusCode: response.statusCode };
    }
  } catch (error) {
    console.log(`  ${colors.red}${checkmarks.fail} Grafana: Error - ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test Admin Dashboard
 */
async function testAdminDashboard() {
  console.log(`\n${colors.cyan}Testing Admin Dashboard...${colors.reset}`);
  try {
    const response = await makeRequest(`${config.adminDashboard.baseUrl}`, {
      timeout: 5000,
    });
    
    if (response.statusCode === 200) {
      const hasReact = response.body.includes('react') || response.body.includes('React');
      const hasHtml = response.body.includes('<!DOCTYPE') || response.body.includes('<html');
      
      console.log(`  ${colors.green}${checkmarks.pass} Admin Dashboard: OK${colors.reset}`);
      console.log(`    Status: Accessible`);
      console.log(`    HTML content: ${hasHtml ? 'Yes' : 'No'}`);
      console.log(`    ${colors.yellow}Note: Login required (admin@example.com / admin123)${colors.reset}`);
      return { success: true };
    } else {
      console.log(`  ${colors.yellow}${checkmarks.warn} Admin Dashboard: ${response.statusCode}${colors.reset}`);
      return { success: false, statusCode: response.statusCode };
    }
  } catch (error) {
    console.log(`  ${colors.red}${checkmarks.fail} Admin Dashboard: Error - ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main verification function
 */
async function verifyAllServices() {
  // Override API URL if we detect Docker but it's still using localhost
  if (isDocker && config.api.baseUrl.includes('localhost')) {
    config.api.baseUrl = 'http://loadbalancer:80';
  }
  
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Mobile App Server - Service Verification${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}Running from: ${isDocker ? 'Docker container' : 'Host machine'}${colors.reset}`);
  console.log(`${colors.cyan}API URL: ${config.api.baseUrl}${colors.reset}`);
  console.log(`${colors.cyan}Prometheus URL: ${config.prometheus.baseUrl}${colors.reset}`);
  console.log(`${colors.cyan}Grafana URL: ${config.grafana.baseUrl}${colors.reset}`);
  
  const results = {
    api: {},
    prometheus: {},
    grafana: {},
    admin: {},
  };
  
  // Test API endpoints
  results.api.health = await testApiHealth();
  results.api.metrics = await testApiMetrics();
  results.api.docs = await testApiDocs();
  
  // Test Prometheus
  results.prometheus.targets = await testPrometheusTargets();
  results.prometheus.query = await testPrometheusQuery();
  
  // Test Grafana
  results.grafana.health = await testGrafanaHealth();
  results.grafana.datasources = await testGrafanaDatasources();
  
  // Test Admin Dashboard
  results.admin.dashboard = await testAdminDashboard();
  
  // Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Summary${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  const allTests = [
    { name: 'API Health', result: results.api.health },
    { name: 'API Metrics', result: results.api.metrics },
    { name: 'API Documentation', result: results.api.docs },
    { name: 'Prometheus Targets', result: results.prometheus.targets },
    { name: 'Prometheus Query', result: results.prometheus.query },
    { name: 'Grafana Health', result: results.grafana.health },
    { name: 'Admin Dashboard', result: results.admin.dashboard },
  ];
  
  const passed = allTests.filter(t => t.result.success).length;
  const failed = allTests.filter(t => !t.result.success).length;
  
  allTests.forEach((test) => {
    const symbol = test.result.success ? checkmarks.pass : checkmarks.fail;
    const color = test.result.success ? colors.green : colors.red;
    console.log(`  ${color}${symbol} ${test.name}${colors.reset}`);
  });
  
  console.log(`\n${colors.cyan}Results: ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset} out of ${allTests.length} tests`);
  
  // Service URLs (show localhost URLs for external access)
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Service URLs (from host machine)${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`  Admin Dashboard: ${colors.cyan}http://localhost${colors.reset}`);
  console.log(`    Login: admin@example.com / admin123`);
  console.log(`  API Server: ${colors.cyan}http://localhost:3000${colors.reset}`);
  console.log(`    Health: ${colors.cyan}http://localhost:3000/health${colors.reset}`);
  console.log(`    Metrics: ${colors.cyan}http://localhost:3000/metrics${colors.reset}`);
  console.log(`    Docs: ${colors.cyan}http://localhost:3000/api/docs${colors.reset}`);
  console.log(`  Prometheus: ${colors.cyan}http://localhost:9090${colors.reset}`);
  console.log(`  Grafana: ${colors.cyan}http://localhost:3001${colors.reset}`);
  console.log(`    Login: admin / G1ng3rb33r`);
  
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);
  
  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

// Run verification
verifyAllServices().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});

