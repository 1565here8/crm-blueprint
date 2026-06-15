#!/bin/bash
# ╔══════════════════════════════════════════════════════════╗
# ║   CRM Domain Adapter — Plug & Play for ANY domain       ║
# ║   Just fill in the config below, run, and you're live    ║
# ╚══════════════════════════════════════════════════════════╝

set -euo pipefail

# ────────────────────────────────────────────────────────────
# ⚙️  CONFIG — Change these for any new domain
# ────────────────────────────────────────────────────────────

# Domain settings
PUBLIC_DOMAIN="tradetoros.com"
ADMIN_SUBDOMAIN="admin.tradetoros.com"
BRAND_NAME="TradeToros"
BRAND_DISPLAY="TRADETOROS"
SUPPORT_EMAIL="support@tradetoros.com"
TAGLINE="Professional trading platform"
PRIMARY_COLOR="#0ea5e9"
ACCENT_COLOR="#f59e0b"

# VPS settings
VPS_IP="216.158.237.213"
VPS_USER="root"
CRM_DIR="/opt/curio-crm"
PM2_NAME="tradetoros-crm"

# ────────────────────────────────────────────────────────────
# 🚀  DEPLOY — No need to change anything below
# ────────────────────────────────────────────────────────────

echo "╔══════════════════════════════════════════════════════════╗"
echo "║         CRM Domain Adapter — Plug & Play Deploy          ║"
echo "║         $BRAND_NAME on $PUBLIC_DOMAIN                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Verify VPS connectivity ────────────────────────
echo "📡 Checking VPS ($VPS_IP)..."
if ! curl -s --connect-timeout 5 http://$VPS_IP:3002/api/health > /dev/null 2>&1; then
  echo "❌ VPS port 3002 not reachable."
  exit 1
fi
echo "✅ VPS is reachable"
echo ""

# ── Step 2: SSH and configure everything ───────────────────
echo "🔑 Connecting to VPS..."
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << ENDSSH

# ── Create CRM directory if needed ──
mkdir -p $CRM_DIR

# ── Write .env with domain config ──
cat > $CRM_DIR/.env << ENVEOF
# ── $BRAND_NAME — Production Environment ───────────────────
NODE_ENV=production
PORT=3002
TRUST_PROXY=1
SESSION_SECRET=\$(openssl rand -hex 32)

ADMIN_USERNAME=admin
ADMIN_PASSWORD=\$(openssl rand -base64 32 | tr -d '=+/' | head -c 24)

# ── Domain wiring ──────────────────────────────────────────
PUBLIC_SITE_URL=https://$PUBLIC_DOMAIN
ADMIN_URL=https://$ADMIN_SUBDOMAIN
CORS_ORIGINS=https://$PUBLIC_DOMAIN,https://www.$PUBLIC_DOMAIN,https://$ADMIN_SUBDOMAIN

# ── Broker brand (change for each broker) ──────────────────
BROKER_NAME=$BRAND_NAME
BROKER_DISPLAY=$BRAND_DISPLAY
BROKER_DOMAIN=$PUBLIC_DOMAIN
BROKER_SUPPORT_EMAIL=$SUPPORT_EMAIL
BROKER_TAGLINE=$TAGLINE
BROKER_PRIMARY_COLOR=$PRIMARY_COLOR
BROKER_ACCENT_COLOR=$ACCENT_COLOR

SEARCH_INDEXING_ENABLED=0

# ── Ollama (if running locally) ────────────────────────────
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_DESK_FAST_MODEL=qwen2.5:3b
OLLAMA_DESK_SMART_MODEL=qwen2.5:3b
ENVEOF

echo "  ✅ .env written"

# ── Install & build if needed ──
if [ ! -d $CRM_DIR/node_modules ]; then
  cd $CRM_DIR && npm ci --production=false 2>&1 | tail -3
fi
cd $CRM_DIR && npm run build 2>&1 | tail -3

# ── Restart PM2 ──
pm2 restart $PM2_NAME 2>/dev/null || pm2 start ecosystem.config.cjs 2>/dev/null || echo "  ⚠️  PM2 not available — start manually"

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  ✅ $BRAND_NAME CRM configured!"
echo ""
echo "  Public site: https://$PUBLIC_DOMAIN"
echo "  Backoffice:  https://$ADMIN_SUBDOMAIN/admin"
echo "  Health:      http://$VPS_IP:3002/api/health"
echo ""
echo "  Next steps:"
echo "    1. Fix Cloudflare SSL (SSL/TLS → Full)"
echo "    2. Update DNS"
echo "    3. Login at https://$ADMIN_SUBDOMAIN/admin"
echo "══════════════════════════════════════════════════════════"

ENDSSH

echo ""
echo "🎉 Deploy complete!"
