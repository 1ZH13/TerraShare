# TerraShare Rollback Strategy

## Overview
This document describes the rollback strategy for TerraShare services deployed on Railway.

## Railway Version History

Railway automatically keeps a history of all deployments. To rollback:

### Using Railway Dashboard
1. Go to [railway.app](https://railway.app)
2. Select your project (TerraShare)
3. Click on the service you want to rollback
4. Go to "Deployments" tab
5. Find the working deployment version
6. Click "..." menu → "Rollback to this version"

### Using Railway CLI
```bash
# List deployments
railway logs --service backend-api

# Rollback to previous deployment
railway rollback --service backend-api

# Rollback to specific deployment
railway rollback --service backend-api --id <deployment-id>
```

## Rollback by Service

### Backend API
```bash
# Quick rollback to previous version
railway rollback --service staging-backend

# Or via dashboard
railway open --service staging-backend
# Then: Deployments → Select working version → Rollback
```

### Web Frontend
```bash
# Quick rollback
railway rollback --service staging-web

# Or via dashboard
railway open --service staging-web
# Then: Deployments → Select working version → Rollback
```

### MCP Server
```bash
# Quick rollback
railway rollback --service staging-mcp

# Or via dashboard
railway open --service staging-mcp
# Then: Deployments → Select working version → Rollback
```

## Emergency Rollback Steps

1. **Immediate action**: Go to Railway dashboard
2. **Select service**: Click on the affected service
3. **Find deployment**: Go to Deployments tab
4. **Rollback**: Click "..." → "Rollback to this version"
5. **Verify**: Check service health

## Prevention

- Always test in staging before production
- Use the deployment workflow with proper verification
- Monitor service health after deployment
- Keep deployment notes for each version

## Contact

For issues, contact @1ZH13 (CODEOWNERS)
