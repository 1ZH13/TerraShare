#!/bin/bash
cd "$(dirname "$0")/apps/backend-api"

# Kill existing process
pkill -f "bun.*index.ts" 2>/dev/null || true
sleep 1

# Start and keep running
while true; do
  bun src/index.ts
  echo "[$(date)] Backend crashed, restarting..."
  sleep 2
done