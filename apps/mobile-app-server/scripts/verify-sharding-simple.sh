#!/bin/bash
# Simple MongoDB Sharding Verification
# Quick commands to verify sharding is working

set -e

MONGOS="mongos1:27017"

echo "🔍 MongoDB Sharding Verification"
echo "=================================="
echo ""

echo "1️⃣ Connect to mongos and run these commands:"
echo ""
echo "   docker compose -f docker-compose.sharding.yml exec mongos1 mongosh"
echo ""
echo "2️⃣ Then run these commands in mongosh:"
echo ""
echo "   # Check cluster status"
echo "   sh.status()"
echo ""
echo "   # Check shards"
echo "   sh.status().shards"
echo ""
echo "   # Check if database is sharded"
echo "   use mobileapp"
echo "   sh.status().databases.find(db => db.database._id === 'mobileapp')"
echo ""
echo "   # Check collection shard key"
echo "   sh.status().databases.find(db => db.database._id === 'mobileapp').collections['mobileapp.users']"
echo ""
echo "   # Check chunk distribution"
echo "   db.users.getShardDistribution()"
echo ""
echo "   # Insert test data"
echo "   for (let i = 1; i <= 10; i++) {"
echo "     db.users.insertOne({"
echo "       email: 'test' + i + '@example.com',"
echo "       name: 'Test User ' + i,"
echo "       password: 'hash',"
echo "       createdAt: new Date()"
echo "     });"
echo "   }"
echo ""
echo "   # Verify distribution"
echo "   db.users.getShardDistribution()"
echo ""
echo "3️⃣ Quick automated checks:"
echo ""

# Quick checks
echo "   Checking shards..."
SHARDS=$(docker compose -f docker-compose.sharding.yml exec -T mongos1 mongosh --quiet --eval "JSON.stringify(sh.status().shards.map(s => s._id))" 2>&1 | grep -o '\[.*\]' | head -1)
if [ -n "$SHARDS" ] && echo "$SHARDS" | grep -q "shard1"; then
  echo "   ✓ Shards found: $SHARDS"
else
  echo "   ⚠ Could not verify shards (run manual check)"
fi

echo ""
echo "   Checking if users collection is sharded..."
SHARD_KEY=$(docker compose -f docker-compose.sharding.yml exec -T mongos1 mongosh mobileapp --quiet --eval "try { var s = sh.status(); var db = s.databases.find(d => d.database._id === 'mobileapp'); if (db && db.collections && db.collections['mobileapp.users']) { print('SHARDED:' + JSON.stringify(db.collections['mobileapp.users'].shardKey)); } else { print('NOT_SHARDED'); } } catch(e) { print('ERROR'); }" 2>&1 | grep "SHARDED:" | cut -d: -f2-)
if [ -n "$SHARD_KEY" ] && echo "$SHARD_KEY" | grep -q "_id"; then
  echo "   ✓ Collection is sharded with key: $SHARD_KEY"
else
  echo "   ⚠ Collection may not be sharded (run manual check)"
fi

echo ""
echo "✅ For detailed verification, use the manual commands above"
echo ""



