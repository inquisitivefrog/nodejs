# How to Verify MongoDB Sharding

## Quick Verification (3 Steps)

### Step 1: Check Cluster Status

```bash
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh --eval "sh.status()"
```

**Expected Output:**
- Should show **2 shards**: `shard1` and `shard2`
- Should show **2 active mongos** routers
- Should show `mobileapp.users` collection in sharded data distribution

### Step 2: Check Shard Distribution

```bash
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh mobileapp --eval "db.users.getShardDistribution()"
```

**Expected Output:**
- Should show chunks distributed across **both shard1 and shard2**
- Each shard should have at least 1 chunk

### Step 3: Insert Test Data and Verify

```bash
# Connect to mongos
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh mobileapp

# Then run in mongosh:
```

```javascript
// Insert 20 test users
for (let i = 1; i <= 20; i++) {
  db.users.insertOne({
    email: `test${i}@example.com`,
    name: `Test User ${i}`,
    password: 'hashedpassword',
    createdAt: new Date()
  });
}

// Check distribution
db.users.getShardDistribution()
```

**Expected Output:**
- Documents should be distributed across **both shards**
- With hashed shard key, distribution should be roughly 50/50

## Detailed Verification Commands

### 1. Verify Shards Are Active

```bash
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh --quiet --eval "sh.status().shards.forEach(s => print(s._id + ': ' + s.host))"
```

**Expected:** Should list `shard1` and `shard2` with their replica set members

### 2. Verify Database is Sharded

```bash
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh --quiet --eval "var db = sh.status().databases.find(d => d.database._id === 'mobileapp'); print('Partitioned: ' + db.database.partitioned)"
```

**Expected:** `Partitioned: true`

### 3. Verify Collection Has Shard Key

```bash
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh mobileapp --quiet --eval "var s = sh.status(); var db = s.databases.find(d => d.database._id === 'mobileapp'); print('Shard Key: ' + JSON.stringify(db.collections['mobileapp.users'].shardKey))"
```

**Expected:** `Shard Key: {"_id":"hashed"}`

### 4. Check Chunk Information

```bash
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh config --quiet --eval "db.chunks.find({ns: 'mobileapp.users'}).forEach(c => print(c.shard + ': ' + c.min._id + ' to ' + c.max._id))"
```

**Expected:** Should show chunks with ranges distributed across shards

### 5. Test Query Performance

```bash
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh mobileapp
```

```javascript
// Targeted query (fast - uses shard key)
var start = new Date();
var user = db.users.findOne({ _id: db.users.findOne()._id });
var duration = new Date() - start;
print("Targeted query: " + duration + "ms");
// Should be < 10ms

// Scatter-gather query (slower - checks all shards)
var start = new Date();
var users = db.users.find({ name: /Test/ }).toArray();
var duration = new Date() - start;
print("Scatter-gather query: " + duration + "ms");
// Will be slower as it checks all shards
```

## What Success Looks Like

✅ **Sharding is working if:**

1. **Two shards are active:**
   ```
   sh.status().shards.length === 2
   ```

2. **Database is partitioned:**
   ```
   sh.status().databases.find(d => d.database._id === 'mobileapp').database.partitioned === true
   ```

3. **Collection has shard key:**
   ```
   sh.status().databases.find(d => d.database._id === 'mobileapp')
     .collections['mobileapp.users'].shardKey
   // Returns: { _id: 'hashed' }
   ```

4. **Chunks are distributed:**
   ```
   db.users.getShardDistribution()
   // Shows chunks on both shard1 and shard2
   ```

5. **Data is distributed:**
   - After inserting test data, documents appear on multiple shards
   - Chunk counts are balanced between shards

## Current Status

Based on the verification, your sharding cluster is **✅ WORKING**:

- ✅ 2 shards active (shard1, shard2)
- ✅ 2 mongos routers running
- ✅ Database `mobileapp` is sharded
- ✅ Collection `users` has shard key `{ _id: 'hashed' }`
- ✅ Chunks distributed: 1 chunk on shard1, 1 chunk on shard2

## Quick Test Script

Run this to insert test data and verify distribution:

```bash
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh mobileapp <<'EOF'
// Insert test data
for (let i = 1; i <= 20; i++) {
  db.users.insertOne({
    email: `test${i}@example.com`,
    name: `Test User ${i}`,
    password: 'hash',
    createdAt: new Date()
  });
}

// Verify distribution
print("\n=== Distribution ===");
db.users.getShardDistribution();

// Count documents
print("\n=== Total Documents ===");
print("Total: " + db.users.countDocuments());
EOF
```

## Troubleshooting

### All data on one shard?
- Check balancer: `sh.isBalancerRunning()`
- Start balancer: `sh.startBalancer()`

### Queries are slow?
- Include shard key in queries when possible
- Check if query is scatter-gather (no shard key)

### Shards not appearing?
- Verify replica sets: `rs.status()` on each shard
- Check if shards were added: `sh.status().shards`




