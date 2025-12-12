#!/bin/bash
# MongoDB Sharding Initialization Script
# This script sets up a complete MongoDB sharded cluster:
# 1. Initializes config server replica set
# 2. Initializes shard replica sets
# 3. Adds shards to the cluster via mongos
# 4. Enables sharding on the database
# 5. Creates a shard key on a collection (optional)

set -e

echo "🚀 Starting MongoDB Sharding Cluster Initialization..."
echo ""

# ============================================
# Step 1: Initialize Config Server Replica Set
# ============================================
echo "📝 Step 1: Initializing Config Server Replica Set..."
echo ""

CONFIG_PRIMARY="configsvr1:27019"
CONFIG_NODES=("configsvr1:27019" "configsvr2:27019" "configsvr3:27019")

# Wait for config servers to be ready
for node in "${CONFIG_NODES[@]}"; do
  host=$(echo $node | cut -d: -f1)
  port=$(echo $node | cut -d: -f2)
  max_retries=30
  retry=0
  
  while [ $retry -lt $max_retries ]; do
    # Try without directConnection first (works better in Docker network)
    PING_RESULT=$(mongosh "mongodb://${host}:${port}/" --quiet --eval "db.adminCommand('ping')" 2>&1)
    # Check for various success patterns
    if echo "$PING_RESULT" | grep -q '"ok" : 1' || \
       echo "$PING_RESULT" | grep -q '"ok":1' || \
       echo "$PING_RESULT" | grep -q '{ ok: 1 }' || \
       echo "$PING_RESULT" | grep -q '"ok".*1' || \
       echo "$PING_RESULT" | grep -qi 'ok.*1'; then
      echo "✓ ${host}:${port} is ready"
      break
    else
      retry=$((retry + 1))
      if [ $retry -lt $max_retries ]; then
        echo "⏳ Waiting for ${host}:${port}... (${retry}/${max_retries})"
        sleep 2
      else
        echo "✗ ${host}:${port} failed to start"
        echo "   Last error: ${PING_RESULT}"
        exit 1
      fi
    fi
  done
done

# Check if config replica set is already initialized
RS_STATUS=$(mongosh "mongodb://${CONFIG_PRIMARY}/" --quiet --eval "rs.status()" 2>&1)
if echo "$RS_STATUS" | grep -qi "configReplSet" && ! echo "$RS_STATUS" | grep -qi "NotYetInitialized"; then
  echo "✓ Config server replica set already initialized"
else
  echo "Initializing config server replica set..."
  mongosh "mongodb://${CONFIG_PRIMARY}/" --quiet <<EOF
rs.initiate({
  _id: "configReplSet",
  configsvr: true,
  members: [
    { _id: 0, host: "configsvr1:27019" },
    { _id: 1, host: "configsvr2:27019" },
    { _id: 2, host: "configsvr3:27019" }
  ]
})
EOF
  echo "⏳ Waiting for config replica set to initialize..."
  sleep 10
  echo "✓ Config server replica set initialized"
fi

echo ""

# ============================================
# Step 2: Initialize Shard 1 Replica Set
# ============================================
echo "📝 Step 2: Initializing Shard 1 Replica Set..."
echo ""

SHARD1_PRIMARY="shard1a:27018"
SHARD1_NODES=("shard1a:27018" "shard1b:27018" "shard1c:27018")

# Wait for shard1 nodes
for node in "${SHARD1_NODES[@]}"; do
  host=$(echo $node | cut -d: -f1)
  port=$(echo $node | cut -d: -f2)
  max_retries=30
  retry=0
  
  while [ $retry -lt $max_retries ]; do
    # Try without directConnection first (works better in Docker network)
    PING_RESULT=$(mongosh "mongodb://${host}:${port}/" --quiet --eval "db.adminCommand('ping')" 2>&1)
    # Check for various success patterns
    if echo "$PING_RESULT" | grep -q '"ok" : 1' || \
       echo "$PING_RESULT" | grep -q '"ok":1' || \
       echo "$PING_RESULT" | grep -q '{ ok: 1 }' || \
       echo "$PING_RESULT" | grep -q '"ok".*1' || \
       echo "$PING_RESULT" | grep -qi 'ok.*1'; then
      echo "✓ ${host}:${port} is ready"
      break
    else
      retry=$((retry + 1))
      if [ $retry -lt $max_retries ]; then
        echo "⏳ Waiting for ${host}:${port}... (${retry}/${max_retries})"
        sleep 2
      else
        echo "✗ ${host}:${port} failed to start"
        echo "   Last error: ${PING_RESULT}"
        exit 1
      fi
    fi
  done
done

# Initialize shard1 replica set
RS_STATUS=$(mongosh "mongodb://${SHARD1_PRIMARY}/" --quiet --eval "rs.status()" 2>&1)
if echo "$RS_STATUS" | grep -qi "shard1" && ! echo "$RS_STATUS" | grep -qi "NotYetInitialized"; then
  echo "✓ Shard 1 replica set already initialized"
else
  echo "Initializing shard1 replica set..."
  mongosh "mongodb://${SHARD1_PRIMARY}/" --quiet <<EOF
rs.initiate({
  _id: "shard1",
  members: [
    { _id: 0, host: "shard1a:27018" },
    { _id: 1, host: "shard1b:27018" },
    { _id: 2, host: "shard1c:27018" }
  ]
})
EOF
  echo "⏳ Waiting for shard1 replica set to initialize..."
  # Wait for primary to be elected
  max_attempts=30
  attempt=0
  while [ $attempt -lt $max_attempts ]; do
    sleep 2
    attempt=$((attempt + 1))
    PRIMARY_CHECK=$(mongosh "mongodb://${SHARD1_PRIMARY}/" --quiet --eval "rs.isMaster().ismaster" 2>&1)
    if echo "$PRIMARY_CHECK" | grep -qi "true"; then
      echo "✓ Shard 1 replica set initialized (primary elected)"
      break
    fi
  done
  if [ $attempt -eq $max_attempts ]; then
    echo "⚠ Shard 1 replica set initialization may still be in progress"
  fi
fi

echo ""

# ============================================
# Step 3: Initialize Shard 2 Replica Set
# ============================================
echo "📝 Step 3: Initializing Shard 2 Replica Set..."
echo ""

SHARD2_PRIMARY="shard2a:27018"
SHARD2_NODES=("shard2a:27018" "shard2b:27018" "shard2c:27018")

# Wait for shard2 nodes
for node in "${SHARD2_NODES[@]}"; do
  host=$(echo $node | cut -d: -f1)
  port=$(echo $node | cut -d: -f2)
  max_retries=30
  retry=0
  
  while [ $retry -lt $max_retries ]; do
    # Try without directConnection first (works better in Docker network)
    PING_RESULT=$(mongosh "mongodb://${host}:${port}/" --quiet --eval "db.adminCommand('ping')" 2>&1)
    # Check for various success patterns
    if echo "$PING_RESULT" | grep -q '"ok" : 1' || \
       echo "$PING_RESULT" | grep -q '"ok":1' || \
       echo "$PING_RESULT" | grep -q '{ ok: 1 }' || \
       echo "$PING_RESULT" | grep -q '"ok".*1' || \
       echo "$PING_RESULT" | grep -qi 'ok.*1'; then
      echo "✓ ${host}:${port} is ready"
      break
    else
      retry=$((retry + 1))
      if [ $retry -lt $max_retries ]; then
        echo "⏳ Waiting for ${host}:${port}... (${retry}/${max_retries})"
        sleep 2
      else
        echo "✗ ${host}:${port} failed to start"
        echo "   Last error: ${PING_RESULT}"
        exit 1
      fi
    fi
  done
done

# Initialize shard2 replica set
RS_STATUS=$(mongosh "mongodb://${SHARD2_PRIMARY}/" --quiet --eval "rs.status()" 2>&1)
if echo "$RS_STATUS" | grep -qi "shard2" && ! echo "$RS_STATUS" | grep -qi "NotYetInitialized"; then
  echo "✓ Shard 2 replica set already initialized"
else
  echo "Initializing shard2 replica set..."
  mongosh "mongodb://${SHARD2_PRIMARY}/" --quiet <<EOF
rs.initiate({
  _id: "shard2",
  members: [
    { _id: 0, host: "shard2a:27018" },
    { _id: 1, host: "shard2b:27018" },
    { _id: 2, host: "shard2c:27018" }
  ]
})
EOF
  echo "⏳ Waiting for shard2 replica set to initialize..."
  # Wait for primary to be elected
  max_attempts=30
  attempt=0
  while [ $attempt -lt $max_attempts ]; do
    sleep 2
    attempt=$((attempt + 1))
    PRIMARY_CHECK=$(mongosh "mongodb://${SHARD2_PRIMARY}/" --quiet --eval "rs.isMaster().ismaster" 2>&1)
    if echo "$PRIMARY_CHECK" | grep -qi "true"; then
      echo "✓ Shard 2 replica set initialized (primary elected)"
      break
    fi
  done
  if [ $attempt -eq $max_attempts ]; then
    echo "⚠ Shard 2 replica set initialization may still be in progress"
  fi
fi

echo ""

  # ============================================
  # Step 4: Wait for mongos to be ready (if running)
  # Note: mongos may not be running yet, so we'll skip if unavailable
  # ============================================
  echo "📝 Step 4: Checking for mongos routers..."
  echo ""

  MONGOS_NODES=("mongos1:27017" "mongos2:27017")
  MONGOS_AVAILABLE=false
  
  for node in "${MONGOS_NODES[@]}"; do
    host=$(echo $node | cut -d: -f1)
    port=$(echo $node | cut -d: -f2)
    max_retries=10
    retry=0
    
    while [ $retry -lt $max_retries ]; do
      PING_RESULT=$(mongosh "mongodb://${host}:${port}/" --quiet --eval "db.adminCommand('ping')" 2>&1)
      if echo "$PING_RESULT" | grep -q '"ok" : 1' || \
         echo "$PING_RESULT" | grep -q '"ok":1' || \
         echo "$PING_RESULT" | grep -q '{ ok: 1 }' || \
         echo "$PING_RESULT" | grep -q '"ok".*1' || \
         echo "$PING_RESULT" | grep -qi 'ok.*1'; then
        echo "✓ ${host}:${port} is ready"
        MONGOS_AVAILABLE=true
        break
      else
        retry=$((retry + 1))
        if [ $retry -lt $max_retries ]; then
          sleep 2
        fi
      fi
    done
  done

  if [ "$MONGOS_AVAILABLE" = false ]; then
    echo "⚠ mongos routers not yet available (they will start after initialization)"
    echo "  You can add shards later by connecting to mongos manually"
    echo ""
    exit 0  # Exit successfully - mongos will be started after this init completes
  fi

  echo ""

# ============================================
# Step 5: Add Shards to Cluster via mongos
# ============================================
echo "📝 Step 5: Adding shards to cluster..."
echo ""

if [ "$MONGOS_AVAILABLE" = false ]; then
  echo "⚠ Skipping shard addition - mongos not yet available"
  echo "  Run this script again after mongos starts, or add shards manually:"
  echo "  mongosh mongodb://mongos1:27017"
  echo "  sh.addShard('shard1/shard1a:27018,shard1b:27018,shard1c:27018')"
  echo "  sh.addShard('shard2/shard2a:27018,shard2b:27018,shard2c:27018')"
  echo ""
  exit 0
fi

MONGOS="mongos1:27017"

# Wait a bit more for mongos to fully initialize
sleep 5

# Check if shards are already added
SHARD_LIST=$(mongosh "mongodb://${MONGOS}/" --quiet --eval "sh.status()" 2>&1)

if echo "$SHARD_LIST" | grep -qi "shard1" && echo "$SHARD_LIST" | grep -qi "shard2"; then
  echo "✓ Shards already added to cluster"
else
  echo "Adding shard1 to cluster..."
  mongosh "mongodb://${MONGOS}/" --quiet <<EOF
sh.addShard("shard1/shard1a:27018,shard1b:27018,shard1c:27018")
EOF
  sleep 5

  echo "Adding shard2 to cluster..."
  mongosh "mongodb://${MONGOS}/" --quiet <<EOF
sh.addShard("shard2/shard2a:27018,shard2b:27018,shard2c:27018")
EOF
  sleep 5

  echo "✓ Shards added to cluster"
fi

echo ""

# ============================================
# Step 6: Enable Sharding on Database
# ============================================
echo "📝 Step 6: Enabling sharding on database 'mobileapp'..."
echo ""

DB_SHARDED=$(mongosh "mongodb://${MONGOS}/?directConnection=true" --quiet --eval "db.adminCommand('listDatabases')" 2>&1)
if echo "$DB_SHARDED" | grep -qi "mobileapp"; then
  echo "Database 'mobileapp' exists, checking if sharding is enabled..."
else
  echo "Creating database 'mobileapp'..."
  mongosh "mongodb://${MONGOS}/?directConnection=true" --quiet <<EOF
use mobileapp
db.createCollection("_init")
EOF
fi

# Enable sharding on the database
mongosh "mongodb://${MONGOS}/" --quiet <<EOF
sh.enableSharding("mobileapp")
EOF

echo "✓ Sharding enabled on database 'mobileapp'"
echo ""

# ============================================
# Step 7: Create Shard Key on Users Collection (Example)
# ============================================
echo "📝 Step 7: Creating shard key on 'users' collection..."
echo ""
echo "Note: Shard key selection is critical for performance."
echo "      Common strategies:"
echo "      - Hashed shard key: Good for even distribution"
echo "      - Range shard key: Good for range queries"
echo "      - Compound shard key: Combines multiple fields"
echo ""

# Check if collection exists and is already sharded
COLLECTION_STATUS=$(mongosh "mongodb://${MONGOS}/mobileapp" --quiet --eval "db.users.getShardDistribution()" 2>&1)

if echo "$COLLECTION_STATUS" | grep -qi "shard key"; then
  echo "✓ Collection 'users' is already sharded"
else
  echo "Creating shard key on 'users' collection using hashed _id..."
  echo "Note: In production, choose shard key based on query patterns"
  
  mongosh "mongodb://${MONGOS}/mobileapp" --quiet <<EOF
// Create collection with shard key
sh.shardCollection("mobileapp.users", { _id: "hashed" })
EOF

  echo "✓ Shard key created on 'users' collection"
fi

echo ""

# ============================================
# Summary
# ============================================
echo "✅ MongoDB Sharding Cluster Initialization Complete!"
echo ""
echo "Cluster Status:"
mongosh "mongodb://${MONGOS}/" --quiet <<EOF
sh.status()
EOF

echo ""
echo "📊 Connection String for Applications:"
echo "   mongodb://mongos1:27017,mongos2:27017/mobileapp"
echo ""
echo "💡 Tips:"
echo "   - Always connect to mongos routers, never directly to shards"
echo "   - Use multiple mongos routers for high availability"
echo "   - Monitor shard distribution: sh.status()"
echo "   - Check chunk distribution: db.users.getShardDistribution()"
echo ""

