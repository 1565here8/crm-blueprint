#!/bin/bash
# ── TradeToros CRM — Deploy Script ───────────────────────────
# Usage: ./deploy-tradetoros.sh [dev|staging|production]
# Default: production

set -euo pipefail

ENV="${1:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║           TradeToros CRM — Deployment Script             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Validate environment ─────────────────────────────────────
if [ ! -d "$PROJECT_ROOT" ]; then
  echo "❌ Project root not found: $PROJECT_ROOT"
  exit 1
fi

cd "$PROJECT_ROOT"

# ── Environment selection ────────────────────────────────────
case "$ENV" in
  dev)
    echo "🔧 Deploying to DEV environment"
    export PUBLIC_SITE_URL="http://localhost:5173"
    export ADMIN_URL="http://localhost:5173"
    export CORS_ORIGINS="http://localhost:5173"
    export NODE_ENV="development"
    ;;
  staging)
    echo "🚀 Deploying to STAGING environment"
    export PUBLIC_SITE_URL="https://staging.tradetoros.com"
    export ADMIN_URL="https://admin-staging.tradetoros.com"
    export CORS_ORIGINS="https://staging.tradetoros.com,https://admin-staging.tradetoros.com"
    export NODE_ENV="production"
    ;;
  production)
    echo "🌐 Deploying to PRODUCTION environment"
    export PUBLIC_SITE_URL="https://tradetoros.com"
    export ADMIN_URL="https://admin.tradetoros.com"
    export CORS_ORIGINS="https://tradetoros.com,https://www.tradetoros.com,https://admin.tradetoros.com"
    export NODE_ENV="production"
    ;;
  *)
    echo "❌ Unknown environment: $ENV"
    echo "   Valid options: dev, staging, production"
    exit 1
    ;;
esac

echo ""
echo "📋 Configuration:"
echo "   PUBLIC_SITE_URL=$PUBLIC_SITE_URL"
echo "   ADMIN_URL=$ADMIN_URL"
echo "   NODE_ENV=$NODE_ENV"
echo ""

# ── Install dependencies ─────────────────────────────────────
echo "📦 Installing dependencies..."
npm ci --production=false 2>&1 | tail -5

# ── Build frontend ───────────────────────────────────────────
echo "🔨 Building frontend..."
npm run build 2>&1 | tail -5

# ── Start server ─────────────────────────────────────────────
echo ""
echo "🚀 Starting TradeToros CRM server..."
echo "   Backoffice: $ADMIN_URL/admin"
echo "   Public site: $PUBLIC_SITE_URL"
echo ""

# Run in background if production, foreground for dev/staging
if [ "$ENV" = "production" ]; then
  nohup npm start > /tmp/tradetoros-crm.log 2>&1 &
  echo "✅ Server started in background (PID: $!)"
  echo "   Logs: tail -f /tmp/tradetoros-crm.log"
else
  npm start
fi
