# AWS Deployment Guide

## Overview

This guide covers deploying the mobile app server to AWS, including considerations for availability zones, MongoDB sharding, and when to use MongoDB Atlas vs self-managed MongoDB.

## Architecture Options

### Option 1: Self-Managed MongoDB on AWS

#### Single Region, Multiple Availability Zones

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                    AWS us-east-1                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  AZ-1a       │  │  AZ-1b       │  │  AZ-1c       │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  │
│  │ mongos1      │  │ mongos2      │  │ mongos3      │  │
│  │ configsvr1   │  │ configsvr2   │  │ configsvr3   │  │
│  │ shard1a (P)  │  │ shard1b (S)  │  │ shard1c (S)  │  │
│  │ shard2a (S)  │  │ shard2b (P)  │  │ shard2c (S)  │  │
│  │ server1      │  │ server2      │  │ server3      │  │
│  │ redis1       │  │ redis2       │  │ redis3       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ High availability (survives AZ failure)
- ✅ Low latency between components (< 1ms typical)
- ✅ Data redundancy across AZs
- ✅ Automatic failover

**Connection String:**
```javascript
// Applications connect to mongos routers in all AZs
mongodb://mongos-az1a:27017,mongos-az1b:27017,mongos-az1c:27017/mobileapp?readPreference=secondaryPreferred
```

**Deployment:**
- Use ECS/EKS for container orchestration
- Deploy mongos routers in each AZ
- Deploy shard replica set members across AZs
- Use Application Load Balancer for mongos routers
- Use EBS volumes for persistent storage

#### Multi-Region (Global Deployment)

**Architecture:**
```
┌──────────────────┐         ┌──────────────────┐
│   AWS us-east-1  │         │   AWS eu-west-1  │
├──────────────────┤         ├──────────────────┤
│ Primary Region   │         │ Secondary Region │
│                  │         │                  │
│ mongos (3x)      │         │ mongos (2x)      │
│ shard1 (3-node)  │◄────────┤ shard1 (read)    │
│ shard2 (3-node)  │  Sync   │ shard2 (read)    │
│                  │         │                  │
└──────────────────┘         └──────────────────┘
```

**Benefits:**
- ✅ Global low latency (read from nearest region)
- ✅ Disaster recovery
- ✅ Geographic data distribution

**Considerations:**
- Higher latency for cross-region writes
- More complex setup
- Higher costs

### Option 2: MongoDB Atlas (Managed Service)

#### What is MongoDB Atlas?

MongoDB Atlas is MongoDB's fully managed cloud database service. It handles:
- Automatic sharding
- Backups and point-in-time recovery
- Monitoring and alerting
- Security and compliance
- Scaling (automatic or manual)

#### Atlas Architecture Options

**1. Single Region Cluster**
```
┌─────────────────────────────────────┐
│      MongoDB Atlas (us-east-1)      │
├─────────────────────────────────────┤
│  M10 Cluster (or higher)            │
│  - 3-node replica set               │
│  - Automatic backups                │
│  - Monitoring included              │
└─────────────────────────────────────┘
```

**2. Multi-Region Cluster**
```
┌──────────────────┐         ┌──────────────────┐
│  Atlas us-east-1 │         │  Atlas eu-west-1 │
├──────────────────┤         ├──────────────────┤
│ Primary Region   │         │ Read Replica     │
│ (Read/Write)     │◄────────┤ (Read Only)      │
└──────────────────┘  Sync   └──────────────────┘
```

**3. Global Cluster (Sharded)**
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Atlas us-east-1 │  │  Atlas eu-west-1 │  │  Atlas ap-south-1│
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ Shard 1 (Primary)│  │ Shard 2 (Primary)│  │ Shard 3 (Primary)│
│ + Read Replicas  │  │ + Read Replicas  │  │ + Read Replicas  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## When to Use Atlas vs Self-Managed

### Use MongoDB Atlas When:

✅ **Operational Simplicity**
- Don't want to manage MongoDB infrastructure
- Small team without MongoDB expertise
- Want to focus on application development

✅ **Automatic Features**
- Automatic backups and point-in-time recovery
- Built-in monitoring and alerting
- Automatic security patches and updates
- Automatic scaling

✅ **Compliance Requirements**
- HIPAA, SOC2, PCI-DSS compliance
- Data residency requirements
- Audit logging requirements

✅ **Global Deployment**
- Need multi-region clusters
- Want automatic read replica management
- Need global sharding

✅ **Cost Efficiency (Small to Medium Scale)**
- Pay only for what you use
- No infrastructure management overhead
- Included monitoring and backups

### Use Self-Managed MongoDB When:

✅ **Full Control**
- Need custom MongoDB configuration
- Want to optimize for specific use cases
- Have MongoDB expertise in-house

✅ **Cost Optimization (Large Scale)**
- Very large deployments (100+ TB)
- Can optimize infrastructure costs
- Have dedicated DevOps team

✅ **Regulatory Requirements**
- Must run on-premise or specific infrastructure
- Data sovereignty requirements
- Custom security requirements

✅ **Learning/Development**
- Want to learn MongoDB internals
- Development/testing environments
- Custom integrations

## Migration Path

### From Self-Managed to Atlas

1. **Export data from current cluster**
   ```bash
   mongodump --uri="mongodb://mongos1:27017/mobileapp" --out=/backup
   ```

2. **Create Atlas cluster**
   - Go to MongoDB Atlas
   - Create cluster (same region as your app)
   - Choose appropriate tier

3. **Import data**
   ```bash
   mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/mobileapp" /backup/mobileapp
   ```

4. **Update connection string**
   ```javascript
   // Old (self-managed)
   MONGODB_URI=mongodb://mongos1:27017,mongos2:27017/mobileapp
   
   // New (Atlas)
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mobileapp?retryWrites=true&w=majority
   ```

5. **No code changes needed** - MongoDB protocol is the same!

### From Atlas to Self-Managed

Reverse the process:
1. Export from Atlas
2. Set up self-managed cluster
3. Import data
4. Update connection string

## AWS Deployment Steps

### Using ECS (Elastic Container Service)

1. **Create ECS Cluster**
   ```bash
   aws ecs create-cluster --cluster-name mobile-app-cluster
   ```

2. **Create Task Definitions**
   - One for mongos routers
   - One for config servers
   - One for shard servers
   - One for application servers

3. **Deploy Services**
   ```bash
   # Deploy mongos routers across AZs
   aws ecs create-service \
     --cluster mobile-app-cluster \
     --service-name mongos \
     --task-definition mongos \
     --desired-count 3 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-az1a,subnet-az1b,subnet-az1c]}"
   ```

4. **Use Application Load Balancer**
   - Target group: mongos routers
   - Health checks: MongoDB ping
   - Connection string: Use ALB DNS name

### Using EKS (Elastic Kubernetes Service)

1. **Create EKS Cluster**
   ```bash
   eksctl create cluster --name mobile-app --region us-east-1
   ```

2. **Deploy MongoDB StatefulSets**
   ```yaml
   # mongos deployment
   apiVersion: apps/v1
   kind: StatefulSet
   metadata:
     name: mongos
   spec:
     serviceName: mongos
     replicas: 3
     template:
       spec:
         containers:
         - name: mongos
           image: mongo:7
   ```

3. **Use Kubernetes Services**
   - Service type: LoadBalancer or ClusterIP
   - Connection string: Use service DNS name

## Connection String Configuration

### Self-Managed (Multi-AZ)

```javascript
// Connect to mongos routers in all AZs
const mongoUri = process.env.MONGODB_URI || 
  'mongodb://mongos-az1a:27017,mongos-az1b:27017,mongos-az1c:27017/mobileapp?readPreference=secondaryPreferred';
```

### MongoDB Atlas

```javascript
// Atlas connection string (from Atlas dashboard)
const mongoUri = process.env.MONGODB_URI || 
  'mongodb+srv://username:password@cluster.mongodb.net/mobileapp?retryWrites=true&w=majority';
```

### Environment-Specific

```javascript
// Use Atlas in production, self-managed in dev
const mongoUri = process.env.NODE_ENV === 'production'
  ? process.env.MONGODB_ATLAS_URI  // Atlas connection string
  : process.env.MONGODB_URI;        // Self-managed connection string
```

## Network Configuration

### Security Groups

**mongos Routers:**
- Inbound: Port 27017 from application servers
- Outbound: All traffic (to config servers and shards)

**Config Servers:**
- Inbound: Port 27019 from mongos routers
- Outbound: All traffic

**Shard Servers:**
- Inbound: Port 27018 from mongos routers
- Outbound: All traffic

**Application Servers:**
- Inbound: Port 3000 from load balancer
- Outbound: Port 27017 to mongos routers

### VPC Configuration

- Use private subnets for MongoDB components
- Use public subnets (with NAT) for application servers
- Use security groups for access control
- Consider VPC peering for multi-region

## Monitoring

### Self-Managed

- Use CloudWatch for infrastructure metrics
- Use MongoDB monitoring tools (mongostat, mongotop)
- Set up alerts for:
  - Disk space
  - CPU/Memory usage
  - Replication lag
  - Connection pool exhaustion

### Atlas

- Built-in monitoring dashboard
- Automatic alerts
- Performance advisor
- Real-time performance panel

## Backup Strategy

### Self-Managed

```bash
# Automated backup script
mongodump --uri="mongodb://mongos1:27017/mobileapp" \
  --out=/backup/$(date +%Y%m%d) \
  --gzip

# Upload to S3
aws s3 sync /backup s3://your-backup-bucket/mongodb/
```

### Atlas

- Automatic daily backups
- Point-in-time recovery
- Backup retention: 2-8 weeks (depending on tier)
- One-click restore

## Cost Comparison

### Self-Managed (Example: 3-node replica set)

- EC2 instances: ~$150-300/month (depending on size)
- EBS storage: ~$50-100/month (1TB)
- Data transfer: ~$10-50/month
- **Total: ~$210-450/month**
- Plus: Your time for management

### Atlas (Example: M10 cluster)

- M10 cluster: ~$57/month (3-node replica set, 10GB storage)
- Additional storage: ~$0.25/GB/month
- **Total: ~$57-100/month** (for small to medium deployments)
- Includes: Backups, monitoring, support

**Break-even point:** Usually around 500GB-1TB of data

## Recommendations

### For Learning/Development
- ✅ Use self-managed (current setup)
- Learn MongoDB internals
- Full control for experimentation

### For Production (Small to Medium)
- ✅ Start with MongoDB Atlas
- Focus on application development
- Scale as needed

### For Production (Large Scale)
- ✅ Consider self-managed if you have expertise
- ✅ Or use Atlas dedicated clusters
- Evaluate based on total cost of ownership

## Next Steps

1. **Try the sharding setup locally:**
   ```bash
   docker compose -f docker-compose.sharding.yml up -d
   docker compose -f docker-compose.sharding.yml --profile sharding up mongodb-sharding-init
   ```

2. **Test with your application:**
   - Update `MONGODB_URI` to point to mongos
   - Verify queries work correctly
   - Monitor shard distribution

3. **Plan AWS deployment:**
   - Choose Atlas or self-managed
   - Set up infrastructure
   - Migrate data
   - Update connection strings

