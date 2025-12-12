#!/bin/bash
# Create MongoDB users BEFORE enabling authentication
# Run this while --auth is NOT enabled

set -e

echo "🔐 Creating MongoDB Users (before enabling authentication)..."
echo ""

MONGO_ROOT_USER="${MONGO_ROOT_USER:-admin}"
MONGO_ROOT_PASSWORD="${MONGO_ROOT_PASSWORD:-admin123}"
MONGO_APP_USER="${MONGO_APP_USER:-appuser}"
MONGO_APP_PASSWORD="${MONGO_APP_PASSWORD:-apppass123}"

CONFIG_PRIMARY="configsvr1:27019"
SHARD1_PRIMARY="shard1a:27018"
SHARD2_PRIMARY="shard2a:27018"
MONGOS="mongos1:27017"

# Wait for services
echo "⏳ Waiting for services..."
sleep 5

# ============================================
# Create root user on Config Servers
# ============================================
echo "📝 Creating root user on config servers..."
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

# ============================================
# Create root user on Shard 1
# ============================================
echo "📝 Creating root user on shard1..."
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

# ============================================
# Create root user on Shard 2
# ============================================
echo "📝 Creating root user on shard2..."
# Connect to replica set to find primary
mongosh "mongodb://shard2a:27018,shard2b:27018,shard2c:27018/admin?replicaSet=shard2" --quiet <<EOF
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

# ============================================
# Create application user via mongos
# ============================================
echo "📝 Creating application user via mongos..."
mongosh "mongodb://${MONGOS}/admin" --quiet <<EOF
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
echo "✅ Users created! Now you can enable --auth and restart the cluster."
echo ""

