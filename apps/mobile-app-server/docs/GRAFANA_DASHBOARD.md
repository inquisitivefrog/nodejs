# Grafana Dashboard Guide

## ✅ Dashboard Created Successfully

A comprehensive monitoring dashboard has been created and automatically provisioned in Grafana.

## Accessing the Dashboard

1. **Open Grafana**: http://localhost:3001
2. **Login**: 
   - Username: `admin`
   - Password: `G1ng3rb33r`
3. **Find the Dashboard**:
   - Click on **"Dashboards"** in the left sidebar (📊 icon)
   - Look for **"Mobile App Server - Monitoring Dashboard"**
   - Click to open it

## Dashboard Panels

The dashboard includes 10 panels monitoring:

### 1. **HTTP Request Rate** (Top Left)
- Shows requests per second by method, route, and status code
- Helps identify traffic patterns and popular endpoints

### 2. **HTTP Error Rate** (Top Right)
- Monitors error rates (4xx, 5xx responses)
- Color-coded thresholds (green/yellow/red)

### 3. **Request Duration (p95)** (Middle Left)
- 95th percentile response time
- Critical for identifying slow endpoints
- Thresholds: <0.5s (green), <1s (yellow), >1s (red)

### 4. **Database Pool Utilization** (Middle Right)
- Shows active connections vs pool size
- Helps prevent connection pool exhaustion
- Thresholds: <70% (green), <90% (yellow), >90% (red)

### 5. **Redis Connection Status** (Bottom Left - Stat)
- Shows if Redis is connected (green) or disconnected (red)
- Per server instance

### 6. **Total HTTP Requests** (Bottom Left - Stat)
- Cumulative request count
- Shows overall traffic volume

### 7. **Job Queue Size** (Bottom Middle Left)
- Monitors background job queue backlog
- Helps identify processing bottlenecks
- Thresholds: <10 (green), <50 (yellow), >50 (red)

### 8. **Node.js Memory Usage** (Bottom Middle Right)
- RSS memory (total process memory)
- Heap used vs heap total
- Helps identify memory leaks

### 9. **Requests by Route** (Bottom Left - Bar Chart)
- Horizontal bar chart showing request rate by endpoint
- Quickly identify most-used routes

### 10. **Error Rate by Status Code** (Bottom Right - Pie Chart)
- Distribution of errors by HTTP status code
- Helps identify common error types

## Prometheus Queries Used

The dashboard uses these PromQL queries:

```promql
# Request rate
rate(mobile_app_http_requests_total[5m])

# Error rate
rate(mobile_app_http_errors_total[5m])

# Request duration (p95)
histogram_quantile(0.95, rate(mobile_app_http_request_duration_seconds_bucket[5m]))

# Database pool utilization
mobile_app_database_pool_active / mobile_app_database_pool_size

# Redis connection
mobile_app_redis_connections

# Job queue size
mobile_app_job_queue_size

# Memory usage
mobile_app_process_resident_memory_bytes
mobile_app_nodejs_heap_size_used_bytes
mobile_app_nodejs_heap_size_total_bytes
```

## Customizing the Dashboard

### Edit Panels
1. Click the panel title
2. Select **"Edit"**
3. Modify the query or visualization settings
4. Click **"Apply"** to save

### Add New Panels
1. Click **"Add"** → **"Visualization"**
2. Select **"Prometheus"** as data source
3. Enter a PromQL query
4. Configure visualization type
5. Click **"Apply"**

### Change Time Range
- Use the time picker in the top right
- Default: Last 1 hour
- Options: Last 5m, 15m, 30m, 1h, 6h, 12h, 24h, 7d, 30d

### Refresh Rate
- Dashboard auto-refreshes every 30 seconds
- Click the refresh icon to manually refresh
- Change refresh interval in dashboard settings

## Troubleshooting

### Dashboard Not Appearing
1. Check Grafana logs: `docker compose logs grafana`
2. Verify dashboard file exists: `docker compose exec grafana ls -la /etc/grafana/provisioning/dashboards/`
3. Restart Grafana: `docker compose restart grafana`

### No Data in Panels
1. Verify Prometheus is scraping metrics: http://localhost:9090/targets
2. Check if metrics exist: http://localhost:9090/graph (query: `mobile_app_http_requests_total`)
3. Verify Prometheus datasource in Grafana: Configuration → Data Sources → Prometheus

### Prometheus Connection Issues
- Grafana datasource URL should be: `http://prometheus:9090` (from inside Docker network)
- If accessing from host, use: `http://localhost:9090`
- Check datasource health in Grafana: Configuration → Data Sources → Prometheus → "Test" button

## Manual Import (Alternative)

If the auto-provisioned dashboard doesn't appear, you can import it manually:

1. Go to Grafana: http://localhost:3001
2. Click **"+"** → **"Import"**
3. Click **"Upload JSON file"**
4. Select: `grafana/provisioning/dashboards/mobile-app-dashboard.json`
5. Select Prometheus datasource
6. Click **"Import"**

## Next Steps

1. **Set up Alerts**: Create alert rules in Prometheus for:
   - High error rates (>5%)
   - Slow response times (p95 > 1s)
   - Database pool exhaustion (>90%)
   - Service downtime

2. **Create Additional Dashboards**:
   - Per-server instance dashboard
   - Business metrics dashboard
   - User activity dashboard

3. **Configure Notifications**:
   - Email alerts
   - Slack/PagerDuty integration
   - On-call rotation

