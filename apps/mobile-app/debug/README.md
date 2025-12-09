# Debug Service

This directory is mounted into the debug container for easy access to scripts and files.

## Usage

### Access the debug container:
```bash
docker compose exec debug sh
```

### MongoDB CLI (mongosh)

Connect to MongoDB:
```bash
mongosh mongodb://mongodb:27017/mobileapp
```

Or use the short form:
```bash
mongosh "mongodb://mongodb/mobileapp"
```

**Example commands:**
```javascript
// List databases
show dbs

// Use mobileapp database
use mobileapp

// List collections
show collections

// Find all users
db.users.find().pretty()

// Find user by email
db.users.findOne({ email: "admin@example.com" })

// Count users
db.users.countDocuments()

// Find admin users
db.users.find({ role: "admin" }).pretty()
```

### Curl Commands

Test API endpoints:
```bash
# Health check
curl http://server:3000/health

# Register a new user
curl -X POST http://server:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://server:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Get current user (replace TOKEN with actual JWT token)
curl http://server:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN"

# Get all users (admin only, replace TOKEN)
curl http://server:3000/api/users \
  -H "Authorization: Bearer TOKEN"
```

### Quick Scripts

You can create scripts in this directory and they'll be available in the container at `/debug`.

Example: `test-api.sh`
```bash
#!/bin/sh
echo "Testing API health..."
curl http://server:3000/health
echo "\n\nTesting login..."
curl -X POST http://server:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

Then run:
```bash
docker compose exec debug sh /debug/test-api.sh
```

