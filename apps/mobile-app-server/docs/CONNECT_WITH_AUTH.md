# Connecting to MongoDB with Authentication

## ❌ Wrong Way (Shows Warning)

```bash
# This connects WITHOUT authentication - you'll see the warning
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh mobileapp
```

## ✅ Correct Way (No Warning)

```bash
# Connect WITH authentication - no warnings!
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh "mongodb://admin:admin123@localhost:27017/mobileapp?authSource=admin"
```

## Connection Strings

### Admin User (Full Access)
```bash
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh "mongodb://admin:admin123@localhost:27017/mobileapp?authSource=admin"
```

### App User (Read/Write on mobileapp)
```bash
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh "mongodb://appuser:apppass123@localhost:27017/mobileapp?authSource=admin"
```

## Why the Warning Appears

The warning appears when you connect **without credentials** because:
- Authentication is enabled on the server (`--auth` flag)
- But you're connecting without providing username/password
- MongoDB allows the connection but warns that access control isn't being used

## Quick Alias (Optional)

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
alias mongosh-auth='docker compose -f docker-compose.sharding.yml exec mongos1 mongosh "mongodb://admin:admin123@localhost:27017/mobileapp?authSource=admin"'
```

Then just run:
```bash
mongosh-auth
```

## Verify No Warning

When you connect with credentials, you should see:
- ✅ No warnings about "Access control is not enabled"
- ✅ Clean connection message
- ✅ Full access to all commands

