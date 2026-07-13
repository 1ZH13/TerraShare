#!/bin/bash
# Railway Setup Script for TerraShare

set -e

echo "🚀 Setting up Railway for TerraShare..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway..."
    railway login
fi

echo "✅ Railway CLI ready"

# Create project
echo "📦 Creating Railway project..."
railway project create terrashare

# Create services
echo "🔧 Creating services..."

# Backend API
echo "  Creating backend-api service..."
railway service create backend-api --source apps/backend-api

# Web Frontend
echo "  Creating web service..."
railway service create web --source apps/web

# MCP Server
echo "  Creating mcp-server service..."
railway service create mcp-server --source apps/mcp-server

# Set environment variables
echo "🔑 Setting environment variables..."

# Backend API variables
railway variables set \
  NODE_ENV=production \
  PORT=3000 \
  MONGODB_URI=\${{MONGODB_URI}} \
  CLERK_SECRET_KEY=\${{CLERK_SECRET_KEY}} \
  JWT_SECRET=\${{JWT_SECRET}} \
  --service backend-api

# Web variables
railway variables set \
  NODE_ENV=production \
  VITE_API_BASE_URL=\${{BACKEND_API_URL}} \
  VITE_CLERK_PUBLISHABLE_KEY=\${{VITE_CLERK_PUBLISHABLE_KEY}} \
  --service web

# MCP Server variables
railway variables set \
  NODE_ENV=production \
  MONGODB_URI=\${{MONGODB_URI}} \
  MCP_TRANSPORT=http \
  --service mcp-server

echo ""
echo "✅ Railway setup complete!"
echo ""
echo "Next steps:"
echo "1. Set up your MongoDB database (Railway or external)"
echo "2. Add your Clerk secrets to Railway dashboard"
echo "3. Configure custom domains if needed"
echo "4. Deploy using: npm run deploy"
echo ""
echo "For more information, see docs/railway-setup.md"
