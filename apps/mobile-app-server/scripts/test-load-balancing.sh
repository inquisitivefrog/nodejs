#!/bin/bash
# Script to test round-robin load balancing
# Makes multiple requests and shows which server instance handled each request

echo "Testing Round-Robin Load Balancing"
echo "=================================="
echo ""

# Number of requests to make
REQUESTS=${1:-10}

echo "Making $REQUESTS requests to http://localhost:3000/health"
echo ""

for i in $(seq 1 $REQUESTS); do
  echo -n "Request $i: "
  response=$(curl -s http://localhost:3000/health)
  server_instance=$(echo $response | grep -o '"serverInstance":"[^"]*"' | cut -d'"' -f4)
  echo "Server Instance: $server_instance"
done

echo ""
echo "Checking nginx access logs for upstream distribution:"
echo "======================================================"
docker compose exec loadbalancer tail -n $REQUESTS /var/log/nginx/access.log | grep -o 'upstream: [^ ]*' | sort | uniq -c

echo ""
echo "Checking server logs:"
echo "===================="
echo ""
echo "Server1 logs (last 5 requests):"
docker compose logs --tail=5 server1 | grep -E "\[server1\]|Server Instance"
echo ""
echo "Server2 logs (last 5 requests):"
docker compose logs --tail=5 server2 | grep -E "\[server2\]|Server Instance"
echo ""
echo "Server3 logs (last 5 requests):"
docker compose logs --tail=5 server3 | grep -E "\[server3\]|Server Instance"




