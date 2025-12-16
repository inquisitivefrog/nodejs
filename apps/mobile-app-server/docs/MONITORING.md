# Monitoring & Observability Guide

This document describes the monitoring and observability features available in the mobile app server.

## Health Check Endpoints

### 1. Full Health Check
**Endpoint**: `GET /health`

Returns comprehensive health information including:
- Server status (healthy/degraded)
- Server instance identifier
- Uptime (formatted and in seconds)
- Database connection status (MongoDB, Redis)
- Memory usage (RSS, heap, system)
- CPU information
- Database connection pool statistics
- Node.js version and environment

**Example Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "server": {
    "instance": "server1",
    "uptime": {
      "seconds": 3600,
      "formatted": "1h 0m 0s"
    },
    "nodeVersion": "v20.11.0",
    "environment": "production"
  },
  "database": {
    "mongodb": {
      "status": "connected",
      "state": "connected",
      "database": "mobileapp",
      "host": "mongodb1",
      "port": 27017
    },
    "redis": {
      "status": "connected"
    },
    "pools": {
      "readPool": {
        "connections": 5,
        "size": 15
      },
      "writePool": {
        "connections": 3,
        "size": 10
      }
    }
  },
  "system": {
    "memory": {
      "rss": 150,
      "heapTotal": 50,
      "heapUsed": 30,
      "external": 5,
      "systemTotal": 8192,
      "systemFree": 4096,
      "systemUsed": 4096
    },
    "cpu": {
      "count": 4,
      "model": "Intel Core i7"
    },
    "platform": "linux",
    "arch": "x64"
  }
}
```

**Status Codes**:
- `200`: Healthy (all dependencies connected)
- `503`: Degraded (one or more dependencies disconnected)

### 2. Liveness Probe
**Endpoint**: `GET /health/live`

Simple endpoint for Kubernetes/Docker liveness probes. Always returns `200 OK` if the server process is running.

**Example Response**:
```json
{
  "status": "alive",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 3. Readiness Probe
**Endpoint**: `GET /health/ready`

Checks if the server is ready to accept traffic by verifying dependencies (MongoDB, Redis).

**Example Response**:
```json
{
  "status": "ready",
  "checks": {
    "mongodb": true,
    "redis": true
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Status Codes**:
- `200`: Ready (all dependencies available)
- `503`: Not ready (one or more dependencies unavailable)

## Prometheus Metrics

### Metrics Endpoint
**Endpoint**: `GET /metrics`

Returns metrics in Prometheus format. This endpoint is exposed through the load balancer and can be scraped by Prometheus.

### Available Metrics

#### HTTP Request Metrics
- `mobile_app_http_request_duration_seconds` (Histogram)
  - Duration of HTTP requests in seconds
  - Labels: `method`, `route`, `status_code`, `server_instance`
  - Buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]

- `mobile_app_http_requests_total` (Counter)
  - Total number of HTTP requests
  - Labels: `method`, `route`, `status_code`, `server_instance`

- `mobile_app_http_errors_total` (Counter)
  - Total number of HTTP errors (status >= 400)
  - Labels: `method`, `route`, `status_code`, `server_instance`

#### System Metrics (Default Prometheus Metrics)
- `mobile_app_process_cpu_user_seconds_total`
- `mobile_app_process_cpu_system_seconds_total`
- `mobile_app_process_resident_memory_bytes`
- `mobile_app_nodejs_heap_size_total_bytes`
- `mobile_app_nodejs_heap_size_used_bytes`
- `mobile_app_nodejs_eventloop_lag_seconds`
- And more...

#### Database Metrics
- `mobile_app_database_pool_size` (Gauge)
  - Database connection pool size
  - Labels: `pool_type` (read/write), `server_instance`

- `mobile_app_database_pool_active` (Gauge)
  - Active database connections in pool
  - Labels: `pool_type` (read/write), `server_instance`

#### Redis Metrics
- `mobile_app_redis_connections` (Gauge)
  - Redis connection status (1 = connected, 0 = disconnected)
  - Labels: `server_instance`

#### Job Queue Metrics
- `mobile_app_job_queue_size` (Gauge)
  - Number of jobs in queue
  - Labels: `queue_name`, `server_instance`

- `mobile_app_job_queue_completed_total` (Counter)
  - Total number of completed jobs
  - Labels: `queue_name`, `server_instance`

- `mobile_app_job_queue_failed_total` (Counter)
  - Total number of failed jobs
  - Labels: `queue_name`, `server_instance`

### Example Prometheus Query

```promql
# Request rate per second
rate(mobile_app_http_requests_total[5m])

# Error rate
rate(mobile_app_http_errors_total[5m])

# Average request duration
rate(mobile_app_http_request_duration_seconds_sum[5m]) / rate(mobile_app_http_request_duration_seconds_count[5m])

# Database pool utilization
mobile_app_database_pool_active / mobile_app_database_pool_size

# Job queue backlog
sum(mobile_app_job_queue_size) by (queue_name)
```

## Prometheus Configuration

### Local Development with Docker Compose

Prometheus and Grafana are included in `docker-compose.yml` for local development:

```bash
# Start all services including Prometheus and Grafana
docker compose up -d

# Access Prometheus UI
open http://localhost:9090

# Access Grafana UI
open http://localhost:3001
# Default credentials: admin/admin (change via GRAFANA_ADMIN_PASSWORD env var)
```

### Scraping Configuration

The Prometheus configuration is located at `prometheus/prometheus.yml` and includes:

```yaml
scrape_configs:
  # Scrape via load balancer (aggregated metrics)
  - job_name: 'mobile-app-server'
    scrape_interval: 15s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['loadbalancer:80']
        labels:
          service: 'mobile-app-server'
          environment: 'development'
  
  # Scrape individual server instances (per-instance metrics)
  - job_name: 'mobile-app-server-instances'
    scrape_interval: 15s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['server1:3000', 'server2:3000', 'server3:3000']
        labels:
          service: 'mobile-app-server'
          environment: 'development'
  
  # Scrape nginx metrics
  - job_name: 'nginx'
    scrape_interval: 15s
    metrics_path: '/nginx-metrics'
    static_configs:
      - targets: ['loadbalancer:80']
        labels:
          service: 'nginx-loadbalancer'
          environment: 'development'
```

### Production Deployment

For production, you can:
1. Use the included Prometheus configuration as a template
2. Deploy Prometheus separately (Kubernetes, dedicated server, etc.)
3. Use a managed Prometheus service (AWS Managed Prometheus, Grafana Cloud, etc.)

### Grafana Dashboards

Recommended Grafana dashboards:
1. **Node.js Application Dashboard** - Use Prometheus Node.js exporter dashboard
2. **HTTP Request Dashboard** - Custom dashboard for request metrics
3. **Database Pool Dashboard** - Monitor connection pool utilization
4. **Job Queue Dashboard** - Monitor background job processing

## Logging

The application uses Winston for structured logging. Logs include:
- Request/response logging with request IDs
- Error logging with stack traces
- Performance logging
- Database query logging (optional)

### Log Levels
- `error`: Errors and exceptions
- `warn`: Warnings and deprecations
- `info`: General information (default)
- `debug`: Debug information (development only)

### Log Files
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Logs rotate daily and are retained for 14-30 days

## Load Balancer Metrics

The nginx load balancer provides metrics via the `/nginx-metrics` endpoint (stub_status module).

### Nginx Metrics Endpoint
**Endpoint**: `GET /nginx-metrics` (internal only, restricted to Docker networks)

Returns nginx connection and request statistics in stub_status format.

### Prometheus Nginx Metrics

The following metrics are automatically collected and exposed via the `/metrics` endpoint:

- `mobile_app_nginx_connections_active` (Gauge) - Active nginx connections
- `mobile_app_nginx_connections_reading` (Gauge) - Connections reading
- `mobile_app_nginx_connections_writing` (Gauge) - Connections writing
- `mobile_app_nginx_connections_waiting` (Gauge) - Connections waiting
- `mobile_app_nginx_connections_accepted_total` (Counter) - Total connections accepted
- `mobile_app_nginx_connections_handled_total` (Counter) - Total connections handled
- `mobile_app_nginx_requests_total` (Counter) - Total requests

### Access Logs

The nginx load balancer also provides access logs that can be analyzed for:
- Request distribution across server instances
- Response times
- Error rates
- Upstream server health

Access logs are available at: `/var/log/nginx/access.log` (inside nginx container)

## Monitoring Best Practices

1. **Set up alerts** for:
   - High error rates (> 5% of requests)
   - Slow response times (> 1 second p95)
   - Database connection pool exhaustion
   - High memory usage (> 80%)
   - Service downtime (health check failures)

2. **Monitor key metrics**:
   - Request rate and latency
   - Error rate
   - Database connection pool utilization
   - Job queue backlog
   - Memory and CPU usage

3. **Use health checks** for:
   - Kubernetes liveness/readiness probes
   - Load balancer health checks
   - Monitoring system checks

4. **Regular reviews**:
   - Review error logs daily
   - Review performance metrics weekly
   - Review capacity metrics monthly

## Error Tracking with Sentry

The application includes Sentry integration for error tracking and performance monitoring.

### Configuration

Set the following environment variables:

```bash
SENTRY_DSN=your-sentry-dsn-here
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
SENTRY_ENABLE_PROFILING=false  # Optional: enable profiling
```

### Features

- **Automatic Error Capture**: All unhandled errors (status >= 500) are automatically sent to Sentry
- **Request Context**: Includes user information, request details, and environment context
- **Performance Monitoring**: Tracks request performance and identifies slow endpoints
- **Filtering**: Health check endpoints and expected errors (4xx) are filtered out
- **User Context**: Automatically includes authenticated user information when available

### Manual Error Reporting

You can also manually capture errors:

```javascript
const { captureException, captureMessage } = require('./config/sentry');

// Capture an exception
try {
  // risky operation
} catch (error) {
  captureException(error, {
    tags: { component: 'payment' },
    extra: { orderId: '12345' },
    user: { id: user.id, email: user.email }
  });
}

// Capture a message
captureMessage('Payment processing started', 'info', {
  tags: { component: 'payment' }
});
```

## Integration with Monitoring Tools

### Prometheus + Grafana
- Scrape metrics from `/metrics` endpoint
- Create dashboards for visualization
- Set up alerting rules
- Pre-configured Grafana datasource in docker-compose setup

### Datadog
- Use Datadog Agent to scrape Prometheus metrics
- Or use Datadog APM for application performance monitoring

### New Relic
- Use New Relic Node.js agent
- Or scrape Prometheus metrics via New Relic Prometheus integration

### ELK Stack (Elasticsearch, Logstash, Kibana)
- Ship logs to Elasticsearch
- Create visualizations in Kibana
- Set up log-based alerts

## Troubleshooting

### Health Check Returns 503
1. Check MongoDB connection: `docker compose exec server1 mongosh mongodb://mongodb1:27017/mobileapp`
2. Check Redis connection: `docker compose exec server1 redis-cli -h redis ping`
3. Check server logs: `docker compose logs server1`

### Metrics Not Appearing
1. Verify `/metrics` endpoint is accessible
2. Check Prometheus scrape configuration
3. Verify server instance labels are correct
4. Check for errors in server logs

### High Memory Usage
1. Check heap usage in metrics
2. Review memory leaks in logs
3. Consider increasing Node.js heap size: `NODE_OPTIONS=--max-old-space-size=4096`



