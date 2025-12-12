#!/bin/bash
# Quick script to check shard key configuration

MONGOS="mongos1:27017"

echo "Checking shard key for mobileapp.users collection..."
echo ""

mongosh "mongodb://${MONGOS}/mobileapp" --quiet <<'EOF'
// Get shard status
var status = sh.status();

// Handle both array and object formats
var databases = Array.isArray(status.databases) 
  ? status.databases 
  : Object.values(status.databases || {});

// Find mobileapp database
var mobileappDb = databases.find(function(db) {
  return db.database && db.database._id === 'mobileapp';
});

if (mobileappDb && mobileappDb.collections) {
  var usersCollection = mobileappDb.collections['mobileapp.users'];
  
  if (usersCollection) {
    print("✓ Collection 'mobileapp.users' is sharded");
    print("  Shard key: " + JSON.stringify(usersCollection.shardKey));
    print("  Unique: " + usersCollection.unique);
    print("  Balancing: " + usersCollection.balancing);
    
    if (usersCollection.chunkMetadata) {
      print("\n  Chunks per shard:");
      usersCollection.chunkMetadata.forEach(function(meta) {
        print("    - " + meta.shard + ": " + meta.nChunks + " chunks");
      });
    }
  } else {
    print("⚠ Collection 'mobileapp.users' not found in shard status");
  }
} else {
  print("⚠ Database 'mobileapp' not found or not sharded");
}
EOF

