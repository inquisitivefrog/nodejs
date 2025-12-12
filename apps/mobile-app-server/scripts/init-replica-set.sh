#!/bin/bash
# MongoDB Replica Set Initialization Script
# This script initializes a 3-node replica set using mongosh

set -e

REPLICA_SET_NAME="rs0"
MONGODB_NODES=("mongodb1:27017" "mongodb2:27017" "mongodb3:27017")

echo "🚀 Starting MongoDB Replica Set Initialization..."
echo ""

# Wait for all MongoDB nodes to be ready
echo "⏳ Waiting for all MongoDB nodes to be ready..."
echo ""

for node in "${MONGODB_NODES[@]}"; do
  host=$(echo $node | cut -d: -f1)
  port=$(echo $node | cut -d: -f2)
  max_retries=30
  retry=0
  
  while [ $retry -lt $max_retries ]; do
    # Use directConnection=true to bypass replica set discovery (needed before replica set is initialized)
    # Check if connection works by testing ping command
    PING_RESULT=$(mongosh "mongodb://${host}:${port}/?directConnection=true" --quiet --eval "db.adminCommand('ping')" 2>&1)
    if echo "$PING_RESULT" | grep -q '"ok" : 1' || echo "$PING_RESULT" | grep -q '"ok":1' || echo "$PING_RESULT" | grep -q '{ ok: 1 }'; then
      echo "✓ ${host}:${port} is ready"
      break
    else
      retry=$((retry + 1))
      if [ $retry -lt $max_retries ]; then
        echo "⏳ Waiting for ${host}:${port}... (${retry}/${max_retries})"
        sleep 2
      else
        echo "✗ ${host}:${port} failed to start (connection test failed)"
        echo "   Last error: ${PING_RESULT}"
        exit 1
      fi
    fi
  done
done

echo ""
echo "✓ All MongoDB nodes are ready!"
echo ""

# Connect to the first node and check if replica set is already initialized
PRIMARY_NODE="${MONGODB_NODES[0]}"
echo "📝 Checking replica set status..."

# Use directConnection=true to connect before replica set is initialized
RS_STATUS_OUTPUT=$(mongosh "mongodb://${PRIMARY_NODE}/?directConnection=true" --quiet --eval "rs.status()" 2>&1)
if echo "$RS_STATUS_OUTPUT" | grep -qi "set" && ! echo "$RS_STATUS_OUTPUT" | grep -qi "NotYetInitialized"; then
  echo "✓ Replica set is already initialized"
  STATUS=$(mongosh "mongodb://${PRIMARY_NODE}/?directConnection=true" --quiet --eval "rs.status().set" 2>/dev/null || echo "")
  MEMBERS=$(mongosh "mongodb://${PRIMARY_NODE}/?directConnection=true" --quiet --eval "rs.status().members.length" 2>/dev/null || echo "")
  echo "  Replica Set Name: ${STATUS}"
  echo "  Members: ${MEMBERS}"
  exit 0
fi

echo "📝 Initializing replica set..."
echo ""

# Create replica set configuration
CONFIG="{ _id: '${REPLICA_SET_NAME}', members: ["
for i in "${!MONGODB_NODES[@]}"; do
  if [ $i -gt 0 ]; then
    CONFIG="${CONFIG}, "
  fi
  CONFIG="${CONFIG}{ _id: ${i}, host: '${MONGODB_NODES[$i]}' }"
done
CONFIG="${CONFIG} ] }"

# Initialize the replica set (use directConnection=true to connect before replica set is initialized)
mongosh "mongodb://${PRIMARY_NODE}/?directConnection=true" --quiet --eval "rs.initiate(${CONFIG})" > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "✗ Failed to initialize replica set"
  exit 1
fi

echo "✓ Replica set initialization command sent"
echo ""
echo "⏳ Waiting for replica set to be ready (this may take 30-60 seconds)..."
echo ""

# Wait for replica set to be ready
max_attempts=60
attempt=0
is_ready=false

while [ $attempt -lt $max_attempts ] && [ "$is_ready" = false ]; do
  sleep 2
  attempt=$((attempt + 1))
  
  STATUS_OUTPUT=$(mongosh "mongodb://${PRIMARY_NODE}/?directConnection=true" --quiet --eval "
    try {
      var status = rs.status();
      var primary = status.members.find(m => m.stateStr === 'PRIMARY');
      var secondaries = status.members.filter(m => m.stateStr === 'SECONDARY');
      if (primary && secondaries.length >= 2) {
        print('READY');
        print('PRIMARY:' + primary.name);
        print('SECONDARIES:' + secondaries.map(s => s.name).join(','));
      } else {
        print('WAITING');
        print('PRIMARY:' + (primary ? primary.name : 'not elected yet'));
        print('SECONDARIES:' + secondaries.length + '/2');
      }
    } catch(e) {
      if (e.codeName === 'NotYetInitialized') {
        print('INITIALIZING');
      } else {
        throw e;
      }
    }
  " 2>/dev/null || echo "ERROR")
  
  if echo "$STATUS_OUTPUT" | grep -q "READY"; then
    is_ready=true
    PRIMARY=$(echo "$STATUS_OUTPUT" | grep "PRIMARY:" | cut -d: -f2)
    SECONDARIES=$(echo "$STATUS_OUTPUT" | grep "SECONDARIES:" | cut -d: -f2)
    echo "✓ Replica set is ready!"
    echo ""
    echo "  Primary: ${PRIMARY}"
    echo "  Secondaries: ${SECONDARIES}"
    echo ""
  elif echo "$STATUS_OUTPUT" | grep -q "WAITING"; then
    PRIMARY=$(echo "$STATUS_OUTPUT" | grep "PRIMARY:" | cut -d: -f2)
    SECONDARIES=$(echo "$STATUS_OUTPUT" | grep "SECONDARIES:" | cut -d: -f2)
    echo "⏳ Waiting for replica set... (${attempt}/${max_attempts})"
    echo "   Primary: ${PRIMARY}"
    echo "   Secondaries: ${SECONDARIES}"
    echo ""
  elif echo "$STATUS_OUTPUT" | grep -q "INITIALIZING"; then
    echo "⏳ Replica set initialization in progress... (${attempt}/${max_attempts})"
    echo ""
  fi
done

if [ "$is_ready" = false ]; then
  echo "✗ Replica set did not become ready in time"
  exit 1
fi

echo "✅ MongoDB Replica Set Initialization Complete!"
echo ""

