#!/bin/bash
# MongoDB Sharding Authentication Setup Script
# This script creates users for the sharded cluster after initialization

set -e

echo "🔐 Setting up MongoDB Authentication for Sharded Cluster..."
echo ""

# Credentials (should be in environment variables in production)
MONGO_ROOT_USER="${MONGO_ROOT_USER:-admin}"
MONGO_ROOT_PASSWORD="${MONGO_ROOT_PASSWORD:-admin123}"
MONGO_APP_USER="${MONGO_APP_USER:-appuser}"
MONGO_APP_PASSWORD="${MONGO_APP_PASSWORD:-apppass123}"

CONFIG_PRIMARY="configsvr1:27019"
SHARD1_PRIMARY="shard1a:27018"
SHARD2_PRIMARY="shard2a:27018"
MONGOS="mongos1:27017"

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# ============================================
# Step 1: Create root user on Config Servers
# ============================================
echo "📝 Step 1: Creating root user on config servers..."
echo ""

mongosh "mongodb://${CONFIG_PRIMARY}/admin" --quiet <<EOF
try {
  var user = db.getUser("${MONGO_ROOT_USER}");
  if (user) {
    print("✓ Root user already exists on config servers");
  } else {
    db.createUser({
      user: "${MONGO_ROOT_USER}",
      pwd: "${MONGO_ROOT_PASSWORD}",
      roles: ["root"]
    });
    print("✓ Root user created on config servers");
  }
} catch(e) {
  print("Error: " + e.message);
}
EOF

echo ""

# ============================================
# Step 2: Create root user on Shard 1
# ============================================
echo "📝 Step 2: Creating root user on shard1..."
echo ""

mongosh "mongodb://${SHARD1_PRIMARY}/admin" --quiet <<EOF
try {
  var user = db.getUser("${MONGO_ROOT_USER}");
  if (user) {
    print("✓ Root user already exists on shard1");
  } else {
    db.createUser({
      user: "${MONGO_ROOT_USER}",
      pwd: "${MONGO_ROOT_PASSWORD}",
      roles: ["root"]
    });
    print("✓ Root user created on shard1");
  }
} catch(e) {
  print("Error: " + e.message);
}
EOF

echo ""

# ============================================
# Step 3: Create root user on Shard 2
# ============================================
echo "📝 Step 3: Creating root user on shard2..."
echo ""

mongosh "mongodb://${SHARD2_PRIMARY}/admin" --quiet <<EOF
try {
  var user = db.getUser("${MONGO_ROOT_USER}");
  if (user) {
    print("✓ Root user already exists on shard2");
  } else {
    db.createUser({
      user: "${MONGO_ROOT_USER}",
      pwd: "${MONGO_ROOT_PASSWORD}",
      roles: ["root"]
    });
    print("✓ Root user created on shard2");
  }
} catch(e) {
  print("Error: " + e.message);
}
EOF

echo ""

# ============================================
# Step 4: Create application user via mongos
# ============================================
echo "📝 Step 4: Creating application user via mongos..."
echo ""

mongosh "mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@${MONGOS}/admin" --quiet <<EOF
try {
  var user = db.getUser("${MONGO_APP_USER}");
  if (user) {
    print("✓ Application user already exists");
  } else {
    db.createUser({
      user: "${MONGO_APP_USER}",
      pwd: "${MONGO_APP_PASSWORD}",
      roles: [
        { role: "readWrite", db: "mobileapp" },
        { role: "read", db: "config" }
      ]
    });
    print("✓ Application user created");
  }
} catch(e) {
  print("Error: " + e.message);
}
EOF

echo ""

# ============================================
# Step 5: Verify users
# ============================================
echo "📝 Step 5: Verifying users..."
echo ""

echo "Config servers:"
mongosh "mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@${CONFIG_PRIMARY}/admin" --quiet --eval "db.getUsers().forEach(u => print('  - ' + u.user))" 2>&1 | grep -E '^\s+-' || echo "  (no users found)"

echo ""
echo "Shard1:"
mongosh "mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@${SHARD1_PRIMARY}/admin" --quiet --eval "db.getUsers().forEach(u => print('  - ' + u.user))" 2>&1 | grep -E '^\s+-' || echo "  (no users found)"

echo ""
echo "Shard2:"
mongosh "mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@${SHARD2_PRIMARY}/admin" --quiet --eval "db.getUsers().forEach(u => print('  - ' + u.user))" 2>&1 | grep -E '^\s+-' || echo "  (no users found)"

echo ""
echo "mongos (admin database):"
mongosh "mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@${MONGOS}/admin" --quiet --eval "db.getUsers().forEach(u => print('  - ' + u.user))" 2>&1 | grep -E '^\s+-' || echo "  (no users found)"

echo ""
echo "✅ Authentication setup complete!"
echo ""
echo "Connection strings:"
echo "  Root user: mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@mongos1:27017/mobileapp"
echo "  App user:  mongodb://${MONGO_APP_USER}:${MONGO_APP_PASSWORD}@mongos1:27017/mobileapp"
echo ""

