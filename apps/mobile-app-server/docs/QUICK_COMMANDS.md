# Quick MongoDB Sharding Commands

## Connect to mongos (with authentication)

```bash
# Connect with admin credentials
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh "mongodb://admin:admin123@localhost:27017/mobileapp?authSource=admin"

# Or with app user
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh "mongodb://appuser:apppass123@localhost:27017/mobileapp?authSource=admin"
```

## Check Shard Key

Once connected, run:

```javascript
// Get shard status
var status = sh.status();

// Access databases (handle different formats)
var dbs = status.databases;
var mobileappDb = null;

// Try array format
if (Array.isArray(dbs)) {
  mobileappDb = dbs.find(d => d.database && d.database._id === 'mobileapp');
} else {
  // Try object format
  var dbArray = Object.values(dbs || {});
  mobileappDb = dbArray.find(d => d.database && d.database._id === 'mobileapp');
}

if (mobileappDb && mobileappDb.collections && mobileappDb.collections['mobileapp.users']) {
  var coll = mobileappDb.collections['mobileapp.users'];
  print("Shard key: " + JSON.stringify(coll.shardKey));
  print("Chunks: " + (coll.chunks ? coll.chunks.length : 0));
} else {
  print("Collection not found or not sharded");
}
```

## Or use the simpler method:

```javascript
// Just check the distribution - this always works
db.users.getShardDistribution()
```

## Common Commands

```javascript
// Check cluster status
sh.status()

// Check data distribution
db.users.getShardDistribution()

// Check if collection is sharded
sh.status().databases.find(db => db.database._id === 'mobileapp')?.collections?.['mobileapp.users']?.shardKey

// Insert test data
for (let i = 1; i <= 10; i++) {
  db.users.insertOne({
    email: `test${i}@example.com`,
    name: `Test ${i}`,
    password: 'hash',
    createdAt: new Date()
  });
}

// Verify distribution
db.users.getShardDistribution()
```

