#!/bin/bash

# Start both servers for TerraShare development

echo "Starting Backend API on port 3000..."
cd /home/macris2004/TerraShare/apps/backend-api
bun run dev &
BACKEND_PID=$!

sleep 2

echo "Starting Web Frontend on port 5173..."
cd /home/macris2004/TerraShare/apps/web
bun run dev &
WEB_PID=$!

echo ""
echo "Servers running:"
echo "  Backend: http://localhost:3000"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "Backend PID: $BACKEND_PID, Web PID: $WEB_PID"

wait