# MongoDB Sharding Quick Start

## What is Sharding?

Sharding is MongoDB's method for distributing data across multiple machines. Think of it like partitioning in Oracle/MySQL, but automatic and transparent.

**Key Concepts:**
- **Shard**: A replica set that stores a portion of your data
- **Config Server**: Stores metadata about which data is on which shard
- **mongos Router**: Query router that applications connect to (like a proxy)
- **Shard Key**: Field(s) that determine how data is distributed

## Quick Start

### 1. Start the Sharded Cluster

```bash
# Step 1: Start all components (mongos will start automatically)
docker compose -f docker-compose.sharding.yml up -d

# Step 2: Wait for mongos to be healthy (check status)
docker compose -f docker-compose.sharding.yml ps mongos1 mongos2

# Step 3: Complete the sharding setup (initializes replica sets and adds shards)
# This only needs to be run once, or after a clean restart
docker compose -f docker-compose.sharding.yml run --rm mongodb-sharding-init /scripts/complete-sharding-setup.sh
```

**Note:** The setup script is idempotent - it checks if things are already configured and skips them. Safe to run multiple times.

### 2. Verify It's Working

```bash
# Connect to mongos
docker compose -f docker-compose.sharding.yml exec mongos1 mongosh

# Check cluster status
sh.status()

# Check shard distribution
use mobileapp
db.users.getShardDistribution()
```

### 3. Update Your Application

Update `MONGODB_URI` to connect to mongos:

```bash
# In docker-compose.sharding.yml, servers already use:
MONGODB_URI: mongodb://mongos1:27017,mongos2:27017/mobileapp
```

## Architecture

```
Application
    ↓
mongos Router (port 27017) ← You connect here!
    ↓
Config Server (metadata lookup)
    ↓
Shard 1 or Shard 2 (actual data)
```

## Key Differences from Replica Set

| Aspect | Replica Set | Sharded Cluster |
|--------|-------------|-----------------|
| **Connection** | Direct to replica set | Connect to mongos |
| **Write Scaling** | Single primary | Multiple shards |
| **Data Size** | Limited by server | Unlimited |
| **Complexity** | Simple | More complex |

## Shard Key Example

```javascript
// Current setup uses hashed _id
sh.shardCollection("mobileapp.users", { _id: "hashed" })

// This distributes data evenly across shards
// Each document's _id is hashed to determine which shard it goes to
```

## Monitoring

```javascript
// Connect to mongos
mongosh mongodb://mongos1:27017

// View cluster status
sh.status()

// Check data distribution
use mobileapp
db.users.getShardDistribution()

// Check chunk information
use config
db.chunks.find({ ns: "mobileapp.users" }).pretty()
```

## AWS Deployment

### Self-Managed on AWS

**Works perfectly with availability zones!** Deploy components across AZs:

```
AZ-1a: mongos1, configsvr1, shard1a (primary)
AZ-1b: mongos2, configsvr2, shard1b, shard2a (primary)
AZ-1c: mongos3, configsvr3, shard1c, shard2b, shard2c
```

**Connection String:**
```javascript
mongodb://mongos-az1a:27017,mongos-az1b:27017,mongos-az1c:27017/mobileapp
```

### MongoDB Atlas (Managed Service)

**When to use:**
- Don't want to manage MongoDB yourself
- Need automatic backups and monitoring
- Want global clusters (multi-region)
- Compliance requirements (HIPAA, SOC2)

**Migration is easy:**
1. Export data from current cluster
2. Create Atlas cluster
3. Import data
4. Update connection string (same MongoDB protocol!)

**No code changes needed** - MongoDB protocol is the same whether self-managed or Atlas.

## Learn More

- See `docs/MONGODB_SHARDING.md` for detailed guide
- See `docs/AWS_DEPLOYMENT.md` for AWS-specific information

