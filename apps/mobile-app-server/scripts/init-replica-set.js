// MongoDB Replica Set Initialization Script
// This script initializes a 3-node replica set

const { MongoClient } = require('mongodb');

const REPLICA_SET_NAME = 'rs0';
const MONGODB_NODES = [
  { host: 'mongodb1', port: 27017 },
  { host: 'mongodb2', port: 27017 },
  { host: 'mongodb3', port: 27017 },
];

async function waitForMongoDB(host, port, maxRetries = 30) {
  const url = `mongodb://${host}:${port}`;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = new MongoClient(url, {
        serverSelectionTimeoutMS: 2000,
        directConnection: true, // Connect directly, bypass replica set discovery
        connectTimeoutMS: 2000,
      });
      await client.connect();
      await client.db('admin').command({ ping: 1 });
      await client.close();
      console.log(`✓ ${host}:${port} is ready`);
      return true;
    } catch (error) {
      if (i < maxRetries - 1) {
        console.log(`⏳ Waiting for ${host}:${port}... (${i + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        console.error(`✗ ${host}:${port} failed to start: ${error.message}`);
        return false;
      }
    }
  }
  return false;
}

async function initializeReplicaSet() {
  console.log('🚀 Starting MongoDB Replica Set Initialization...\n');

  // Wait for all MongoDB nodes to be ready
  console.log('⏳ Waiting for all MongoDB nodes to be ready...\n');
  const readyNodes = [];
  for (const node of MONGODB_NODES) {
    const isReady = await waitForMongoDB(node.host, node.port);
    if (isReady) {
      readyNodes.push(node);
    }
  }

  if (readyNodes.length < 3) {
    console.error(`\n✗ Only ${readyNodes.length}/3 nodes are ready. Cannot initialize replica set.`);
    process.exit(1);
  }

  console.log('\n✓ All MongoDB nodes are ready!\n');

  // Connect to the first node to initialize the replica set
  // Use directConnection to bypass replica set discovery (since it's not initialized yet)
  const primaryUrl = `mongodb://${MONGODB_NODES[0].host}:${MONGODB_NODES[0].port}`;
  const client = new MongoClient(primaryUrl, {
    directConnection: true, // Connect directly to this node
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    console.log(`✓ Connected to ${MONGODB_NODES[0].host}:${MONGODB_NODES[0].port}\n`);

    const adminDb = client.db('admin');

    // Check if replica set is already initialized
    try {
      const status = await adminDb.command({ replSetGetStatus: 1 });
      console.log('✓ Replica set is already initialized');
      console.log(`  Replica Set Name: ${status.set}`);
      console.log(`  Members: ${status.members.length}`);
      await client.close();
      return;
    } catch (error) {
      // Replica set not initialized yet, continue
      if (error.codeName !== 'NotYetInitialized') {
        throw error;
      }
    }

    // Initialize the replica set
    console.log('📝 Initializing replica set...\n');

    const config = {
      _id: REPLICA_SET_NAME,
      members: MONGODB_NODES.map((node, index) => ({
        _id: index,
        host: `${node.host}:${node.port}`,
      })),
    };

    await adminDb.command({
      replSetInitiate: config,
    });

    console.log('✓ Replica set initialization command sent\n');
    console.log('⏳ Waiting for replica set to be ready (this may take 30-60 seconds)...\n');

    // Wait for replica set to be ready
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 60;

    while (!isReady && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;

      try {
        const status = await adminDb.command({ replSetGetStatus: 1 });
        const primary = status.members.find((m) => m.stateStr === 'PRIMARY');
        const secondaries = status.members.filter((m) => m.stateStr === 'SECONDARY');

        if (primary && secondaries.length >= 2) {
          isReady = true;
          console.log('✓ Replica set is ready!\n');
          console.log(`  Primary: ${primary.name}`);
          console.log(`  Secondaries: ${secondaries.map((s) => s.name).join(', ')}\n`);
        } else {
          console.log(`⏳ Waiting for replica set... (${attempts}/${maxAttempts})`);
          console.log(`   Primary: ${primary ? primary.name : 'not elected yet'}`);
          console.log(`   Secondaries: ${secondaries.length}/2\n`);
        }
      } catch (error) {
        if (error.codeName === 'NotYetInitialized') {
          console.log(`⏳ Replica set initialization in progress... (${attempts}/${maxAttempts})\n`);
        } else {
          throw error;
        }
      }
    }

    if (!isReady) {
      console.error('\n✗ Replica set did not become ready in time');
      process.exit(1);
    }

    console.log('✅ MongoDB Replica Set Initialization Complete!\n');
  } catch (error) {
    console.error('\n✗ Error initializing replica set:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the initialization
initializeReplicaSet().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

