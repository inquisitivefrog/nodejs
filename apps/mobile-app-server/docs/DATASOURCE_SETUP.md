# Grafana Prometheus Datasource Setup

## Quick Fix: Verify Datasource Connection

The dashboard should now work, but if you still see "datasource not found" errors, follow these steps:

### Option 1: Verify Datasource is Configured (Recommended)

1. **Open Grafana**: http://localhost:3001
2. **Login**: 
   - Username: `admin`
   - Password: `G1ng3rb33r`
3. **Go to Data Sources**:
   - Click **Configuration** (gear icon) → **Data Sources**
   - You should see **"Prometheus"** listed
4. **Test the Connection**:
   - Click on **"Prometheus"**
   - Click **"Save & Test"** button at the bottom
   - You should see: ✅ **"Data source is working"**

### Option 2: Manually Add Datasource (If Missing)

If the Prometheus datasource doesn't appear:

1. **Add New Datasource**:
   - Click **Configuration** → **Data Sources** → **Add data source**
   - Select **"Prometheus"**

2. **Configure**:
   - **Name**: `Prometheus`
   - **URL**: `http://prometheus:9090` (from inside Docker) or `http://localhost:9090` (if accessing from host)
   - **Access**: `Server (default)`
   - Click **"Save & Test"**

3. **Set as Default** (Optional):
   - Toggle **"Default"** switch
   - Click **"Save & Test"**

### Option 3: Update Dashboard to Use Specific Datasource

If you want the dashboard to use a specific datasource UID:

1. **Find the Datasource UID**:
   - Go to **Configuration** → **Data Sources** → **Prometheus**
   - Look at the URL: `http://localhost:3001/datasources/edit/{UID}`
   - The UID is in the URL

2. **Update Dashboard** (if needed):
   - The dashboard currently uses `"-- Grafana --"` which means "use default datasource"
   - This should work if Prometheus is set as default
   - If not, you can edit the dashboard and change datasource references

## Verify Dashboard Works

1. **Open Dashboard**:
   - Go to **Dashboards** → **Browse**
   - Open **"Mobile App Server - Monitoring Dashboard"**

2. **Check Panels**:
   - If panels show "No data", check:
     - Time range (top right) - try "Last 1 hour"
     - Datasource selector in each panel - should show "Prometheus"
     - Prometheus is running: http://localhost:9090/targets

3. **Test Query**:
   - Click on any panel → **Edit**
   - Check the query: `rate(mobile_app_http_requests_total[5m])`
   - Click **"Run query"** - should show data if metrics exist

## Troubleshooting

### "Data source not found" Error

**Cause**: Dashboard references a datasource that doesn't exist or has wrong UID.

**Fix**:
1. Verify datasource exists: Configuration → Data Sources
2. If missing, add it (see Option 2 above)
3. If exists but dashboard still errors, edit dashboard and select correct datasource

### "No data" in Panels

**Possible causes**:
1. **No metrics yet**: Make some API requests to generate data
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:3000/api/v1/users
   ```

2. **Time range too narrow**: Change time range to "Last 1 hour" or "Last 6 hours"

3. **Prometheus not scraping**: Check http://localhost:9090/targets - all should be "UP"

4. **Wrong datasource**: Edit panel and verify datasource is "Prometheus"

### Prometheus Connection Issues

**From Grafana logs**:
```bash
docker compose logs grafana | grep -i prometheus
```

**Test Prometheus directly**:
```bash
curl http://localhost:9090/api/v1/query?query=mobile_app_http_requests_total
```

**Check Prometheus targets**:
- Open: http://localhost:9090/targets
- All targets should show "UP" status

## Current Configuration

- **Datasource Name**: Prometheus
- **URL**: `http://prometheus:9090` (from Docker network)
- **Access**: Server (proxy)
- **Default**: Yes (should be set)
- **Dashboard Reference**: Uses default datasource (`"-- Grafana --"`)

## Next Steps

Once datasource is working:
1. ✅ Dashboard should show graphs
2. ✅ All 10 panels should display data
3. ✅ Metrics update every 30 seconds (auto-refresh)

If you still have issues, the dashboard can be manually edited in Grafana UI to select the correct datasource for each panel.

