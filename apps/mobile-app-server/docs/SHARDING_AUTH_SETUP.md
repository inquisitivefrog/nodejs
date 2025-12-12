# Enabling Authentication for MongoDB Sharding

## Quick Setup

### Step 1: Restart Cluster with Authentication

The `docker-compose.sharding.yml` has been updated to enable authentication. Restart the cluster:

```bash
# Stop current cluster
docker compose -f docker-compose.sharding.yml down

# Start with authentication enabled
docker compose -f docker-compose.sharding.yml up -d

# Wait for services to be healthy
docker compose -f docker-compose.sharding.yml ps
```

### Step 2: Create Users

After the cluster is running, create users:

```bash
docker compose -f docker-compose.sharding.yml run --rm mongodb-sharding-init /scripts/init-sharding-auth.sh
```

This creates:
- **Root user**: `admin` / `admin123` (full access)
- **App user**: `appuser` / `apppass123` (read/write on mobileapp)

### Step 3: Connect with Authentication

```bash
# Connect to mongos with authentication
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh "mongodb://admin:admin123@localhost:27017/mobileapp?authSource=admin"
```

The warning about "Access control is not enabled" will be gone!

## What Changed

1. **Keyfile created**: `mongodb-keyfile` (already in `.gitignore`)
2. **All MongoDB services** now use:
   - `--keyFile /etc/mongodb-keyfile` (replica set authentication)
   - `--auth` (enables authentication)
3. **Connection strings** updated to include credentials
4. **User creation script** ready to run

## Connection Strings

### For Applications
```javascript
mongodb://appuser:apppass123@mongos1:27017,mongos2:27017/mobileapp?authSource=admin
```

### For Administration
```javascript
mongodb://admin:admin123@mongos1:27017,mongos2:27017/mobileapp?authSource=admin
```

## Next Steps

1. Restart the cluster (as shown above)
2. Run the user creation script
3. Update your application's `MONGODB_URI` if needed
4. Restart application services

See `docs/SHARDING_AUTHENTICATION.md` for detailed documentation.

