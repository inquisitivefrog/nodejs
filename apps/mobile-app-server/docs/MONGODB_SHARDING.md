# MongoDB Sharding Guide

## Overview

MongoDB sharding is a method for distributing data across multiple machines. This guide explains how to set up and use MongoDB sharding in this project.

## Architecture

### Components

1. **Config Servers (3 nodes)**
   - Store cluster metadata (shard keys, chunk distribution)
   - Must be a replica set for high availability
   - Port: 27019

2. **Shards (2 shards, each a 3-node replica set)**
   - Store actual data
   - Each shard is a replica set for high availability
   - Port: 27018

3. **mongos Routers (2 instances)**
   - Query routers that applications connect to
   - Route queries to appropriate shards
   - Port: 27017 (standard MongoDB port)

### Data Flow

```
Application → mongos Router → Config Server (metadata lookup) → Shard(s) → Data
```

## Starting the Sharded Cluster

### Using Docker Compose

```bash
# Start all sharding components
docker compose -f docker-compose.sharding.yml up -d

# Initialize the cluster (one-time setup)
docker compose -f docker-compose.sharding.yml --profile sharding up mongodb-sharding-init
```

### Manual Initialization

If you need to reinitialize:

```bash
# Connect to mongos
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh

# Check cluster status
sh.status()

# View shard distribution
use mobileapp
db.users.getShardDistribution()
```

## Connection String

### For Applications

Connect to **mongos routers**, not shards directly:

```javascript
// Connection string for sharded cluster
mongodb://mongos1:27017,mongos2:27017/mobileapp
```

### Why mongos?

- **Query Routing**: mongos routes queries to the correct shard(s)
- **Transparency**: Applications don't need to know which shard has which data
- **Load Balancing**: Multiple mongos instances distribute query load
- **High Availability**: If one mongos fails, use another

## Shard Keys

### What is a Shard Key?

A shard key determines how data is distributed across shards. It's similar to a partition key in Oracle/MySQL.

### Shard Key Strategies

1. **Hashed Shard Key** (Current Setup)
   ```javascript
   sh.shardCollection("mobileapp.users", { _id: "hashed" })
   ```
   - **Pros**: Even data distribution
   - **Cons**: Range queries may hit all shards
   - **Use Case**: When you need even distribution and don't do range queries

2. **Range Shard Key**
   ```javascript
   sh.shardCollection("mobileapp.users", { email: 1 })
   ```
   - **Pros**: Efficient range queries
   - **Cons**: Potential hot spots if data is uneven
   - **Use Case**: When you frequently query by ranges (e.g., date ranges)

3. **Compound Shard Key**
   ```javascript
   sh.shardCollection("mobileapp.users", { region: 1, createdAt: 1 })
   ```
   - **Pros**: Combines benefits of both
   - **Cons**: More complex to choose correctly
   - **Use Case**: When you need both distribution and range query efficiency

### Choosing a Shard Key

**Critical Considerations:**
- **Cardinality**: High cardinality (many unique values) is better
- **Frequency**: Should match common query patterns
- **Distribution**: Should distribute data evenly
- **Monotonic**: Avoid monotonically increasing keys (causes hot spots)

**Example for Users Collection:**
```javascript
// Good: Hashed _id (even distribution)
{ _id: "hashed" }

// Good: Email (high cardinality, common query pattern)
{ email: 1 }

// Bad: CreatedAt alone (monotonic, causes hot spots)
{ createdAt: 1 }

// Good: Compound with region first
{ region: 1, createdAt: 1 }
```

## Monitoring Sharding

### Check Cluster Status

```javascript
// Connect to mongos
mongosh mongodb://mongos1:27017

// View cluster status
sh.status()

// View detailed shard information
sh.status(true)
```

### Check Shard Distribution

```javascript
use mobileapp

// Check how data is distributed across shards
db.users.getShardDistribution()

// Check chunk distribution
db.users.stats()
```

### Check Chunk Information

```javascript
// View chunks for a collection
use config
db.chunks.find({ ns: "mobileapp.users" }).pretty()

// Count chunks per shard
db.chunks.aggregate([
  { $match: { ns: "mobileapp.users" } },
  { $group: { _id: "$shard", count: { $sum: 1 } } }
])
```

## Adding More Shards

To add a third shard:

```javascript
// Connect to mongos
mongosh mongodb://mongos1:27017

// Add new shard (after setting up shard3 replica set)
sh.addShard("shard3/shard3a:27018,shard3b:27018,shard3c:27018")

// MongoDB will automatically rebalance data
```

## AWS Deployment Considerations

### Availability Zones

When deploying to AWS with multiple availability zones:

#### Option 1: Self-Managed MongoDB (Current Setup)

**Architecture:**
```
AZ-1: mongos1, configsvr1, shard1a (primary)
AZ-2: mongos2, configsvr2, shard1b, shard2a (primary)
AZ-3: configsvr3, shard1c, shard2b, shard2c
```

**Pros:**
- Full control
- No vendor lock-in
- Cost-effective at scale
- Can optimize for your use case

**Cons:**
- You manage backups, monitoring, updates
- More operational overhead
- Need MongoDB expertise

**Connection String:**
```javascript
// Use mongos routers in different AZs
mongodb://mongos-az1:27017,mongos-az2:27017,mongos-az3:27017/mobileapp
```

**Network Considerations:**
- Use VPC for security
- Ensure low latency between AZs (< 1ms typical)
- Configure security groups properly
- Use EBS volumes for data persistence

#### Option 2: MongoDB Atlas (Managed Service)

**What is MongoDB Atlas?**
- Fully managed MongoDB service by MongoDB Inc.
- Handles sharding, backups, monitoring automatically
- Available on AWS, Azure, GCP

**When to Use Atlas:**
- ✅ Don't want to manage MongoDB infrastructure
- ✅ Need automatic backups and point-in-time recovery
- ✅ Want built-in monitoring and alerting
- ✅ Need global clusters (multi-region)
- ✅ Want automatic scaling
- ✅ Compliance requirements (HIPAA, SOC2, etc.)

**When to Use Self-Managed:**
- ✅ Need full control over configuration
- ✅ Have MongoDB expertise in-house
- ✅ Cost optimization at very large scale
- ✅ Custom requirements not supported by Atlas
- ✅ Regulatory requirements for on-premise

**Migration Path:**
If you start with self-managed and want to move to Atlas:
1. Export data from current cluster
2. Create Atlas cluster
3. Import data
4. Update connection strings
5. No code changes needed (same MongoDB protocol)

### AWS-Specific Configuration

#### Using EC2 Instances

```yaml
# Example: Deploy mongos in different AZs
mongos-az1:
  image: mongo:7
  # Deploy to us-east-1a
  deploy:
    placement:
      constraints:
        - node.availability_zone == us-east-1a

mongos-az2:
  image: mongo:7
  # Deploy to us-east-1b
  deploy:
    placement:
      constraints:
        - node.availability_zone == us-east-1b
```

#### Using ECS/EKS

- Deploy mongos routers as services in different AZs
- Use Application Load Balancer to route to mongos instances
- Use EBS volumes for persistent storage
- Configure auto-scaling for mongos routers based on load

#### Network Configuration

```javascript
// Connection string with read preference for multi-AZ
mongodb://mongos-az1:27017,mongos-az2:27017,mongos-az3:27017/mobileapp?readPreference=secondaryPreferred
```

## Performance Considerations

### Chunk Size

Default chunk size is 64MB. Data is distributed in chunks across shards.

```javascript
// Check current chunk size
use config
db.settings.findOne({ _id: "chunksize" })

// Change chunk size (requires careful consideration)
db.settings.save({ _id: "chunksize", value: 128 })
```

### Balancing

MongoDB automatically rebalances chunks when:
- Chunk size exceeds threshold
- Shard imbalance is detected

```javascript
// Check if balancing is running
sh.isBalancerRunning()

// Manually trigger balancing
sh.startBalancer()

// Stop balancing (for maintenance)
sh.stopBalancer()
```

### Query Performance

**Targeted Queries** (include shard key):
```javascript
// Fast: Includes shard key, goes to one shard
db.users.find({ _id: ObjectId("...") })

// Fast: Includes shard key prefix
db.users.find({ email: "user@example.com" })
```

**Scatter-Gather Queries** (don't include shard key):
```javascript
// Slower: Must query all shards
db.users.find({ name: "John" })

// Very slow: Must query all shards and sort
db.users.find().sort({ createdAt: -1 })
```

## Troubleshooting

### Check if Sharding is Working

```javascript
// Connect to mongos
mongosh mongodb://mongos1:27017

// Verify sharding is enabled
sh.status()

// Check if collection is sharded
use mobileapp
db.users.getShardDistribution()
```

### Common Issues

1. **"not sharded" error**
   - Enable sharding on database: `sh.enableSharding("mobileapp")`
   - Shard the collection: `sh.shardCollection("mobileapp.users", { _id: "hashed" })`

2. **Uneven data distribution**
   - Check shard key choice
   - May need to change shard key (requires data migration)

3. **Slow queries**
   - Ensure queries include shard key when possible
   - Check if balancing is running: `sh.isBalancerRunning()`

## Comparison: Replica Set vs Sharded Cluster

| Feature | Replica Set | Sharded Cluster |
|---------|-------------|-----------------|
| **Write Scaling** | Limited (single primary) | Unlimited (multiple shards) |
| **Read Scaling** | Good (multiple secondaries) | Excellent (multiple shards) |
| **Data Size** | Limited by single server | Unlimited (distributed) |
| **Complexity** | Low | High |
| **Use Case** | < 1TB, moderate write load | > 1TB, high write load |

## Next Steps

1. **Start with replica set** (current setup) - simpler, sufficient for most cases
2. **Move to sharding** when:
   - Data size exceeds single server capacity
   - Write load exceeds single primary capacity
   - Need geographic distribution

## Resources

- [MongoDB Sharding Documentation](https://www.mongodb.com/docs/manual/sharding/)
- [Shard Key Selection Guide](https://www.mongodb.com/docs/manual/core/sharding-shard-key/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

