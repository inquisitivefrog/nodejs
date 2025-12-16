const client = require('prom-client');
const http = require('http');
const logger = require('./logger');

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'mobile_app_',
});

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'mobile_app_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'server_instance'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

const httpRequestTotal = new client.Counter({
  name: 'mobile_app_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'server_instance'],
  registers: [register],
});

const httpRequestErrors = new client.Counter({
  name: 'mobile_app_http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status_code', 'server_instance'],
  registers: [register],
});

const activeConnections = new client.Gauge({
  name: 'mobile_app_active_connections',
  help: 'Number of active connections',
  labelNames: ['server_instance'],
  registers: [register],
});

const databasePoolSize = new client.Gauge({
  name: 'mobile_app_database_pool_size',
  help: 'Database connection pool size',
  labelNames: ['pool_type', 'server_instance'],
  registers: [register],
});

const databasePoolActive = new client.Gauge({
  name: 'mobile_app_database_pool_active',
  help: 'Active database connections in pool',
  labelNames: ['pool_type', 'server_instance'],
  registers: [register],
});

const redisConnections = new client.Gauge({
  name: 'mobile_app_redis_connections',
  help: 'Redis connection status (1 = connected, 0 = disconnected)',
  labelNames: ['server_instance'],
  registers: [register],
});

const jobQueueSize = new client.Gauge({
  name: 'mobile_app_job_queue_size',
  help: 'Number of jobs in queue',
  labelNames: ['queue_name', 'server_instance'],
  registers: [register],
});

const jobQueueCompleted = new client.Counter({
  name: 'mobile_app_job_queue_completed_total',
  help: 'Total number of completed jobs',
  labelNames: ['queue_name', 'server_instance'],
  registers: [register],
});

const jobQueueFailed = new client.Counter({
  name: 'mobile_app_job_queue_failed_total',
  help: 'Total number of failed jobs',
  labelNames: ['queue_name', 'server_instance'],
  registers: [register],
});

// Nginx load balancer metrics
const nginxConnectionsActive = new client.Gauge({
  name: 'mobile_app_nginx_connections_active',
  help: 'Active nginx connections',
  registers: [register],
});

const nginxConnectionsReading = new client.Gauge({
  name: 'mobile_app_nginx_connections_reading',
  help: 'Nginx connections reading',
  registers: [register],
});

const nginxConnectionsWriting = new client.Gauge({
  name: 'mobile_app_nginx_connections_writing',
  help: 'Nginx connections writing',
  registers: [register],
});

const nginxConnectionsWaiting = new client.Gauge({
  name: 'mobile_app_nginx_connections_waiting',
  help: 'Nginx connections waiting',
  registers: [register],
});

const nginxConnectionsAccepted = new client.Counter({
  name: 'mobile_app_nginx_connections_accepted_total',
  help: 'Total nginx connections accepted',
  registers: [register],
});

const nginxConnectionsHandled = new client.Counter({
  name: 'mobile_app_nginx_connections_handled_total',
  help: 'Total nginx connections handled',
  registers: [register],
});

const nginxRequestsTotal = new client.Counter({
  name: 'mobile_app_nginx_requests_total',
  help: 'Total nginx requests',
  registers: [register],
});

/**
 * Record HTTP request metrics
 */
function recordHttpRequest(method, route, statusCode, duration) {
  const serverInstance = process.env.SERVER_INSTANCE || 'unknown';
  const labels = {
    method,
    route: route || 'unknown',
    status_code: statusCode,
    server_instance: serverInstance,
  };

  httpRequestDuration.observe(labels, duration / 1000); // Convert to seconds
  httpRequestTotal.inc(labels);

  if (statusCode >= 400) {
    httpRequestErrors.inc(labels);
  }
}

/**
 * Update database pool metrics
 */
function updateDatabasePoolMetrics(poolStats) {
  if (!poolStats) return;

  const serverInstance = process.env.SERVER_INSTANCE || 'unknown';

  if (poolStats.readPool) {
    databasePoolSize.set(
      { pool_type: 'read', server_instance: serverInstance },
      poolStats.readPool.size || 0
    );
    databasePoolActive.set(
      { pool_type: 'read', server_instance: serverInstance },
      poolStats.readPool.connections || 0
    );
  }

  if (poolStats.writePool) {
    databasePoolSize.set(
      { pool_type: 'write', server_instance: serverInstance },
      poolStats.writePool.size || 0
    );
    databasePoolActive.set(
      { pool_type: 'write', server_instance: serverInstance },
      poolStats.writePool.connections || 0
    );
  }
}

/**
 * Update Redis connection metric
 */
function updateRedisMetric(isConnected) {
  const serverInstance = process.env.SERVER_INSTANCE || 'unknown';
  redisConnections.set({ server_instance: serverInstance }, isConnected ? 1 : 0);
}

/**
 * Update job queue metrics
 */
function updateJobQueueMetrics(queueName, size, completed, failed) {
  const serverInstance = process.env.SERVER_INSTANCE || 'unknown';
  const labels = { queue_name: queueName, server_instance: serverInstance };

  if (size !== undefined) {
    jobQueueSize.set(labels, size);
  }
  if (completed !== undefined) {
    jobQueueCompleted.inc(labels, completed);
  }
  if (failed !== undefined) {
    jobQueueFailed.inc(labels, failed);
  }
}

/**
 * Fetch and parse nginx stub_status metrics
 */
async function updateNginxMetrics() {
  const nginxMetricsUrl = process.env.NGINX_METRICS_URL || 'http://loadbalancer/nginx-metrics';
  
  try {
    const response = await new Promise((resolve, reject) => {
      const req = http.get(nginxMetricsUrl, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      });
      req.on('error', reject);
      req.setTimeout(2000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });

    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}`);
    }

    // Parse nginx stub_status format:
    // Active connections: 1
    // server accepts handled requests
    //  123 456 789
    // Reading: 0 Writing: 1 Waiting: 0
    const lines = response.data.split('\n');
    const activeMatch = lines[0].match(/Active connections:\s+(\d+)/);
    const statsMatch = lines[2].match(/\s+(\d+)\s+(\d+)\s+(\d+)/);
    const connectionsMatch = lines[3].match(/Reading:\s+(\d+)\s+Writing:\s+(\d+)\s+Waiting:\s+(\d+)/);

    if (activeMatch) {
      nginxConnectionsActive.set(parseInt(activeMatch[1], 10));
    }
    if (statsMatch) {
      nginxConnectionsAccepted.inc(parseInt(statsMatch[1], 10));
      nginxConnectionsHandled.inc(parseInt(statsMatch[2], 10));
      nginxRequestsTotal.inc(parseInt(statsMatch[3], 10));
    }
    if (connectionsMatch) {
      nginxConnectionsReading.set(parseInt(connectionsMatch[1], 10));
      nginxConnectionsWriting.set(parseInt(connectionsMatch[2], 10));
      nginxConnectionsWaiting.set(parseInt(connectionsMatch[3], 10));
    }
  } catch (error) {
    // Silently fail - nginx metrics are optional
    // logger.debug('Failed to fetch nginx metrics:', error.message);
  }
}

/**
 * Get metrics in Prometheus format
 */
async function getMetrics() {
  try {
    // Update database pool metrics
    try {
      const { getPoolStats } = require('./database-pools');
      const poolStats = getPoolStats();
      updateDatabasePoolMetrics(poolStats);
    } catch (error) {
      logger.warn('Failed to update pool metrics:', error.message);
    }

    // Update Redis metric
    try {
      const { getRedisClient } = require('./redis');
      const redisClient = getRedisClient();
      const isConnected =
        redisClient && (redisClient.status === 'ready' || redisClient.status === 'connect');
      updateRedisMetric(isConnected);
    } catch (error) {
      updateRedisMetric(false);
    }

    // Update nginx metrics (non-blocking)
    updateNginxMetrics().catch(() => {
      // Silently fail - nginx metrics are optional
    });

    return await register.metrics();
  } catch (error) {
    logger.error('Error getting metrics:', error);
    throw error;
  }
}

module.exports = {
  register,
  recordHttpRequest,
  updateDatabasePoolMetrics,
  updateRedisMetric,
  updateJobQueueMetrics,
  getMetrics,
  // Export metrics for direct access if needed
  httpRequestDuration,
  httpRequestTotal,
  httpRequestErrors,
  activeConnections,
  databasePoolSize,
  databasePoolActive,
  redisConnections,
  jobQueueSize,
  jobQueueCompleted,
  jobQueueFailed,
};



