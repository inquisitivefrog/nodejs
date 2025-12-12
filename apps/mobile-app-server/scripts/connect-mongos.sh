#!/bin/bash
# Connect to mongos with authentication (no warnings!)

docker compose -f docker-compose.sharding.yml exec mongos1 mongosh "mongodb://admin:admin123@localhost:27017/mobileapp?authSource=admin" "$@"

