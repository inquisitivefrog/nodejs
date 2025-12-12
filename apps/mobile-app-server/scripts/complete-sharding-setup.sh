#!/bin/bash
# Complete Sharding Setup Script
# This script completes the sharding setup by adding shards to mongos
# Run this after mongos routers are healthy and shard replica sets are initialized

set -e

echo "🚀 Completing MongoDB Sharding Setup..."
echo ""

MONGOS="mongos1:27017"

# Wait for mongos to be ready
echo "⏳ Waiting for mongos to be ready..."
max_retries=30
retry=0

while [ $retry -lt $max_retries ]; do
  # Try without directConnection first (works better in Docker network)
  PING_RESULT=$(mongosh "mongodb://${MONGOS}/" --quiet --eval "db.adminCommand('ping')" 2>&1)
  # Check for various success patterns in the output
  if echo "$PING_RESULT" | grep -q '"ok" : 1' || \
     echo "$PING_RESULT" | grep -q '"ok":1' || \
     echo "$PING_RESULT" | grep -q '{ ok: 1 }' || \
     echo "$PING_RESULT" | grep -q '"ok".*1' || \
     echo "$PING_RESULT" | grep -qi 'ok.*1'; then
    echo "✓ mongos is ready"
    break
  else
    retry=$((retry + 1))
    if [ $retry -lt $max_retries ]; then
      echo "⏳ Waiting for mongos... (${retry}/${max_retries})"
      sleep 2
    else
      echo "✗ mongos failed to start"
      echo "   Last error: ${PING_RESULT}"
      exit 1
    fi
  fi
done

echo ""

# Check if shards are already added
echo "📝 Checking current shard status..."
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

# Enable sharding on database
echo "📝 Enabling sharding on database 'mobileapp'..."
mongosh "mongodb://${MONGOS}/" --quiet <<EOF
sh.enableSharding("mobileapp")
EOF
echo "✓ Sharding enabled on database 'mobileapp'"
echo ""

# Create shard key on users collection
echo "📝 Creating shard key on 'users' collection..."
COLLECTION_STATUS=$(mongosh "mongodb://${MONGOS}/mobileapp" --quiet --eval "db.users.getShardDistribution()" 2>&1)

if echo "$COLLECTION_STATUS" | grep -qi "shard key"; then
  echo "✓ Collection 'users' is already sharded"
else
  mongosh "mongodb://${MONGOS}/mobileapp" --quiet <<EOF
sh.shardCollection("mobileapp.users", { _id: "hashed" })
EOF
  echo "✓ Shard key created on 'users' collection"
fi

echo ""

# Show final status
echo "✅ Sharding Setup Complete!"
echo ""
echo "Cluster Status:"
mongosh "mongodb://${MONGOS}/" --quiet <<EOF
sh.status()
EOF

