#!/bin/bash
# MongoDB Sharding Verification Script
# This script verifies that sharding is working correctly

set -e

echo "🔍 MongoDB Sharding Verification"
echo "=================================="
echo ""

MONGOS="mongos1:27017"

# Check if mongos is accessible
echo "1️⃣ Checking mongos connectivity..."
PING_RESULT=$(mongosh "mongodb://${MONGOS}/" --quiet --eval "db.adminCommand('ping')" 2>&1)
if echo "$PING_RESULT" | grep -q '"ok".*1' || echo "$PING_RESULT" | grep -qi 'ok.*1'; then
  echo "✓ mongos is accessible"
else
  echo "✗ Cannot connect to mongos"
  exit 1
fi
echo ""

# Check cluster status
echo "2️⃣ Checking cluster status..."
echo ""
SHARD_COUNT=$(mongosh "mongodb://${MONGOS}/" --quiet --eval "sh.status().shards.length" 2>&1 | grep -E '^[0-9]+$' | head -1)
if [ -n "$SHARD_COUNT" ] && [ "$SHARD_COUNT" -gt 0 ]; then
  echo "✓ Found $SHARD_COUNT shard(s) in cluster"
  mongosh "mongodb://${MONGOS}/" --quiet --eval "sh.status().shards.forEach(function(s) { print('  - ' + s._id + ': ' + s.host); })" 2>&1 | grep -E '^\s+-' || true
else
  echo "⚠ No shards found in cluster"
fi
echo ""

# Check if database is sharded
echo "3️⃣ Checking if database is sharded..."
echo ""
DB_STATUS=$(mongosh "mongodb://${MONGOS}/" --quiet --eval "sh.status().databases.find(db => db.database._id === 'mobileapp')" 2>&1)
if echo "$DB_STATUS" | grep -qi "mobileapp"; then
  echo "✓ Database 'mobileapp' exists in cluster"
  if echo "$DB_STATUS" | grep -qi "partitioned.*true"; then
    echo "✓ Database is partitioned (sharded)"
  else
    echo "⚠ Database exists but may not be fully sharded"
  fi
else
  echo "⚠ Database 'mobileapp' not found (may need to enable sharding)"
fi
echo ""

# Check if users collection is sharded
echo "4️⃣ Checking if 'users' collection is sharded..."
echo ""
COLLECTION_INFO=$(mongosh "mongodb://${MONGOS}/mobileapp" --quiet --eval "sh.status().databases.find(db => db.database._id === 'mobileapp')?.collections?.['mobileapp.users']" 2>&1)
if echo "$COLLECTION_INFO" | grep -qi "shardKey"; then
  echo "✓ Collection 'users' is sharded"
  SHARD_KEY=$(echo "$COLLECTION_INFO" | grep -o '"shardKey"[^}]*' | head -1)
  echo "  Shard key: $SHARD_KEY"
else
  echo "⚠ Collection 'users' may not be sharded"
fi
echo ""

# Check chunk distribution
echo "5️⃣ Checking chunk distribution..."
echo ""
CHUNK_INFO=$(mongosh "mongodb://${MONGOS}/mobileapp" --quiet --eval "try { var s = sh.status(); var db = s.databases.find(d => d.database._id === 'mobileapp'); if (db && db.collections && db.collections['mobileapp.users']) { var coll = db.collections['mobileapp.users']; if (coll.chunkMetadata) { coll.chunkMetadata.forEach(function(m) { print(m.shard + ':' + m.nChunks); }); print('TOTAL:' + coll.chunks.length); } else { print('NO_METADATA'); } } else { print('NO_COLLECTION'); } } catch(e) { print('ERROR:' + e.message); }" 2>&1)
if echo "$CHUNK_INFO" | grep -q ":"; then
  echo "Chunks per shard:"
  echo "$CHUNK_INFO" | grep -E '^[^:]+:[0-9]+$' | sed 's/^/  - /' | sed 's/:/: /'
  TOTAL=$(echo "$CHUNK_INFO" | grep "TOTAL:" | cut -d: -f2)
  if [ -n "$TOTAL" ]; then
    echo "  Total chunks: $TOTAL"
  fi
else
  echo "⚠ No chunk information available"
fi
echo ""

# Insert test data and verify distribution
echo "6️⃣ Inserting test data to verify sharding..."
echo ""
mongosh "mongodb://${MONGOS}/mobileapp" --quiet <<EOF
// Clear existing test users
db.users.deleteMany({ email: { \$regex: /^test-user-.*@example.com\$/ } });

// Insert 10 test users
print("Inserting 10 test users...");
for (var i = 1; i <= 10; i++) {
  db.users.insertOne({
    email: "test-user-" + i + "@example.com",
    name: "Test User " + i,
    password: "hashedpassword" + i,
    createdAt: new Date()
  });
}
print("✓ Inserted 10 test users");
EOF
echo ""

# Check data distribution across shards
echo "7️⃣ Verifying data distribution across shards..."
echo ""
DISTRIBUTION=$(mongosh "mongodb://${MONGOS}/mobileapp" --quiet --eval "try { var dist = db.users.getShardDistribution(); dist.forEach(function(s) { print(s.shard + ':' + s.count); }); } catch(e) { print('ERROR:' + e.message); }" 2>&1)
if echo "$DISTRIBUTION" | grep -q ":"; then
  echo "Document distribution:"
  echo "$DISTRIBUTION" | grep -E '^[^:]+:[0-9]+$' | sed 's/^/  - /' | sed 's/:/: /'
else
  echo "⚠ Could not get distribution (collection may be empty or not sharded)"
fi
echo ""

# Test targeted query (with shard key)
echo "8️⃣ Testing targeted query (includes shard key)..."
echo ""
QUERY_RESULT=$(mongosh "mongodb://${MONGOS}/mobileapp" --quiet --eval "try { var testUser = db.users.findOne({ email: /^test-user-.*@example.com\$/ }); if (testUser) { var start = new Date(); var user = db.users.findOne({ _id: testUser._id }); var duration = new Date() - start; print('SUCCESS:' + duration + 'ms:' + user.email); } else { print('NO_TEST_DATA'); } } catch(e) { print('ERROR:' + e.message); }" 2>&1)
if echo "$QUERY_RESULT" | grep -q "SUCCESS:"; then
  DURATION=$(echo "$QUERY_RESULT" | grep "SUCCESS:" | cut -d: -f2)
  EMAIL=$(echo "$QUERY_RESULT" | grep "SUCCESS:" | cut -d: -f3-)
  echo "✓ Targeted query (with shard key) completed in ${DURATION}ms"
  echo "  Found user: $EMAIL"
else
  echo "⚠ Could not test targeted query (no test data found)"
fi
echo ""

# Test scatter-gather query (without shard key)
echo "9️⃣ Testing scatter-gather query (without shard key)..."
echo ""
SCATTER_RESULT=$(mongosh "mongodb://${MONGOS}/mobileapp" --quiet --eval "try { var start = new Date(); var users = db.users.find({ name: /^Test User/ }).toArray(); var duration = new Date() - start; print('SUCCESS:' + duration + 'ms:' + users.length); } catch(e) { print('ERROR:' + e.message); }" 2>&1)
if echo "$SCATTER_RESULT" | grep -q "SUCCESS:"; then
  DURATION=$(echo "$SCATTER_RESULT" | grep "SUCCESS:" | cut -d: -f2)
  COUNT=$(echo "$SCATTER_RESULT" | grep "SUCCESS:" | cut -d: -f3)
  echo "✓ Scatter-gather query (without shard key) completed in ${DURATION}ms"
  echo "  Found $COUNT users"
  echo "  Note: This query must check all shards"
else
  echo "⚠ Could not test scatter-gather query"
fi
echo ""

# Check balancer status
echo "🔟 Checking balancer status..."
echo ""
BALANCER_STATUS=$(mongosh "mongodb://${MONGOS}/" --quiet --eval "try { var b = sh.status().balancer; print('ENABLED:' + b['Currently enabled']); print('RUNNING:' + b['Currently running']); print('FAILED:' + (b['Failed balancer rounds in last 5 attempts'] || 0)); } catch(e) { print('ERROR:' + e.message); }" 2>&1)
ENABLED=$(echo "$BALANCER_STATUS" | grep "ENABLED:" | cut -d: -f2)
RUNNING=$(echo "$BALANCER_STATUS" | grep "RUNNING:" | cut -d: -f2)
FAILED=$(echo "$BALANCER_STATUS" | grep "FAILED:" | cut -d: -f2)
echo "  Balancer enabled: $ENABLED"
echo "  Balancer running: $RUNNING"
if [ -n "$FAILED" ] && [ "$FAILED" -gt 0 ]; then
  echo "  ⚠ Warning: $FAILED failed balancer rounds"
fi
echo ""

# Summary
echo "✅ Verification Complete!"
echo ""
echo "Summary:"
echo "  - Connect to mongos: mongodb://mongos1:27017"
echo "  - View full status: sh.status()"
echo "  - Check distribution: db.users.getShardDistribution()"
echo "  - View chunks: use config; db.chunks.find({ns: 'mobileapp.users'})"
echo ""

