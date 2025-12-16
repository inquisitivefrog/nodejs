#!/bin/sh
# Wait for backend servers to be available before starting nginx

echo "Waiting for backend servers to be ready..."

wait_for_server() {
  host=$1
  port=$2
  max_attempts=30
  attempt=0

  while [ $attempt -lt $max_attempts ]; do
    if nc -z $host $port 2>/dev/null; then
      echo "✓ $host:$port is ready"
      return 0
    fi
    attempt=$((attempt + 1))
    echo "⏳ Waiting for $host:$port... ($attempt/$max_attempts)"
    sleep 2
  done

  echo "✗ $host:$port failed to become ready"
  return 1
}

wait_for_server server1 3000
wait_for_server server2 3000
wait_for_server server3 3000

echo "All backend servers are ready!"
exec nginx -g "daemon off;"




