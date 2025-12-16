# MongoDB Sharding Authentication Setup

This guide explains how authentication is configured for the MongoDB sharded cluster.

## Overview

Authentication is enabled using:
- **Keyfile**: Shared secret for replica set member authentication
- **Users**: Database users for application and administrative access

## Setup Process

### 1. Keyfile Already Created

The keyfile (`mongodb-keyfile`) has been created and is mounted to all MongoDB containers.

**⚠️ Important:** The keyfile must:
- Be readable by the MongoDB process (permissions 400 or 600)
- Be the same file on all replica set members
- Not be committed to git (already in `.gitignore`)

### 2. Enable Authentication (Already Configured)

All MongoDB services in `docker-compose.sharding.yml` are configured with:
- `--keyFile /etc/mongodb-keyfile` - For replica set authentication
- `--auth` - Enables authentication

### 3. Create Users

After starting the cluster, create users:

```bash
docker compose -f docker-compose.sharding.yml run --rm mongodb-sharding-init /scripts/init-sharding-auth.sh
```

This creates:
- **Root user** (`admin` / `admin123`) - Full administrative access
- **Application user** (`appuser` / `apppass123`) - Read/write access to `mobileapp` database

## Connection Strings

### Root User (Administrative)
```javascript
mongodb://admin:admin123@mongos1:27017,mongos2:27017/mobileapp?authSource=admin
```

### Application User
```javascript
mongodb://appuser:apppass123@mongos1:27017,mongos2:27017/mobileapp?authSource=admin
```

### From mongosh
```bash
# Connect with authentication
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh "mongodb://admin:admin123@localhost:27017/mobileapp?authSource=admin"
```

## Updating Application Connection

Update your application's `MONGODB_URI` environment variable:

```bash
# In docker-compose.sharding.yml or .env file
MONGODB_URI=mongodb://appuser:apppass123@mongos1:27017,mongos2:27017/mobileapp?authSource=admin
```

## User Roles

### Root User
- **Username:** `admin`
- **Password:** `admin123` (change in production!)
- **Roles:** `root` (full access to all databases)

### Application User
- **Username:** `appuser`
- **Password:** `apppass123` (change in production!)
- **Roles:**
  - `readWrite` on `mobileapp` database
  - `read` on `config` database (needed for sharding operations)

## Security Notes

### Production Recommendations

1. **Change Default Passwords:**
   ```bash
   # Set environment variables before running init script
   export MONGO_ROOT_PASSWORD="your-secure-password"
   export MONGO_APP_PASSWORD="your-app-password"
   docker compose -f docker-compose.sharding.yml run --rm mongodb-sharding-init /scripts/init-sharding-auth.sh
   ```

2. **Use Strong Keyfile:**
   ```bash
   # Generate a new keyfile (already done, but for reference)
   openssl rand -base64 756 > mongodb-keyfile
   chmod 400 mongodb-keyfile
   ```

3. **Restrict Network Access:**
   - Don't expose MongoDB ports publicly
   - Use Docker networks for internal communication
   - Use firewall rules in production

4. **Use TLS/SSL:**
   - Enable TLS for encrypted connections
   - Use certificates for authentication

## Troubleshooting

### "Authentication failed" errors

1. **Check if users exist:**
   ```bash
   docker compose -f docker-compose.sharding.yml exec mongos1 mongosh "mongodb://admin:admin123@localhost:27017/admin" --eval "db.getUsers()"
   ```

2. **Verify keyfile permissions:**
   ```bash
   ls -la mongodb-keyfile
   # Should show: -r-------- (400 permissions)
   ```

3. **Check connection string:**
   - Ensure `authSource=admin` is included
   - Verify username and password are correct
   - Check that mongos is using the keyfile

### "Keyfile must be readable" errors

```bash
# Fix keyfile permissions
chmod 400 mongodb-keyfile
docker compose -f docker-compose.sharding.yml restart
```

### Users not created

If users weren't created during initialization:

```bash
# Manually create users
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh admin <<EOF
db.createUser({
  user: "admin",
  pwd: "admin123",
  roles: ["root"]
});

db.createUser({
  user: "appuser",
  pwd: "apppass123",
  roles: [
    { role: "readWrite", db: "mobileapp" },
    { role: "read", db: "config" }
  ]
});
EOF
```

## Verification

### Test Authentication

```bash
# Should work (with auth)
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh "mongodb://admin:admin123@localhost:27017/mobileapp?authSource=admin" --eval "db.runCommand('ping')"

# Should fail (without auth)
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh "mongodb://localhost:27017/mobileapp" --eval "db.runCommand('ping')"
```

### Check Users

```bash
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh "mongodb://admin:admin123@localhost:27017/admin" --eval "db.getUsers()"
```

## Migration from Non-Authenticated Setup

If you have an existing cluster without authentication:

1. **Stop the cluster:**
   ```bash
   docker compose -f docker-compose.sharding.yml down
   ```

2. **Update docker-compose.sharding.yml** (already done)

3. **Start the cluster:**
   ```bash
   docker compose -f docker-compose.sharding.yml up -d
   ```

4. **Create users:**
   ```bash
   docker compose -f docker-compose.sharding.yml run --rm mongodb-sharding-init /scripts/init-sharding-auth.sh
   ```

5. **Update connection strings** in your application

6. **Restart application services:**
   ```bash
   docker compose -f docker-compose.sharding.yml restart server1 server2 server3 worker
   ```



