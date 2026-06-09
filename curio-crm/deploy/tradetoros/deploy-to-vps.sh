#!/bin/bash
# ╔══════════════════════════════════════════════════════════╗
# ║   TradeToros CRM — Plug & Play Deploy to Jersey VPS    ║
# ║   SSH into VPS, run this script, done in 2 minutes      ║
# ╚══════════════════════════════════════════════════════════╝

set -euo pipefail

VPS_IP="216.158.237.213"
VPS_USER="root"
CRM_DIR="/opt/curio-crm"
PM2_NAME="tradetoros-crm"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║         TradeToros CRM — Plug & Play Deploy             ║"
echo "║         Target: $VPS_USER@$VPS_IP                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Verify VPS is reachable ────────────────────────
echo "📡 Checking VPS connectivity..."
if ! curl -s --connect-timeout 5 http://$VPS_IP:3002/api/health > /dev/null 2>&1; then
  echo "❌ VPS port 3002 not reachable. Is the CRM server running?"
  exit 1
fi
echo "✅ VPS is reachable on port 3002"
echo ""

# ── Step 2: SSH into VPS and configure ─────────────────────
echo "🔑 Connecting to VPS via SSH..."
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << 'ENDSSH'

echo "══════════════════════════════════════════════════════════"
echo "  Configuring TradeToros CRM on Jersey VPS"
echo "══════════════════════════════════════════════════════════"
echo ""

# ── Step 3: Set environment variables ──────────────────────
echo "📝 Setting environment variables..."

# Find and update the PM2 ecosystem file or .env
if [ -f /opt/curio-crm/.env ]; then
  echo "  Found existing .env — updating..."
  ENV_FILE="/opt/curio-crm/.env"
elif [ -f /opt/curio-crm/server/.env ]; then
  ENV_FILE="/opt/curio-crm/server/.env"
else
  # Create new .env in the CRM directory
  mkdir -p /opt/curio-crm
  ENV_FILE="/opt/curio-crm/.env"
  echo "  Creating new .env file..."
fi

cat > "$ENV_FILE" << 'ENVEOF'
# ── TradeToros CRM — Production Environment ────────────────
NODE_ENV=production
PORT=3002
TRUST_PROXY=1
SESSION_SECRET=$(openssl rand -hex 32)

# Admin account (change these!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me-to-strong-password

# ── Domain wiring ──────────────────────────────────────────
PUBLIC_SITE_URL=https://tradetoros.com
ADMIN_URL=https://admin.tradetoros.com
CORS_ORIGINS=https://tradetoros.com,https://www.tradetoros.com,https://admin.tradetoros.com

# Search indexing
SEARCH_INDEXING_ENABLED=0

# ── Ollama (if running locally) ────────────────────────────
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_DESK_FAST_MODEL=qwen2.5:3b
OLLAMA_DESK_SMART_MODEL=qwen2.5:3b

# ── Vendor license (uncomment when ready) ──────────────────
# VENDOR_LICENSE_ENABLED=1
# VENDOR_TENANT_ID=tradetoros
# VENDOR_LICENSE_KEY=clk-issued-by-curionilabs
ENVEOF

echo "  ✅ .env written to $ENV_FILE"
echo ""

# ── Step 4: Update PM2 ecosystem if it exists ──────────────
echo "🔄 Updating PM2 configuration..."
if [ -f /opt/curio-crm/ecosystem.config.cjs ]; then
  echo "  Found ecosystem.config.cjs — updating env vars..."
  # PM2 reloads env from .env automatically on restart
else
  echo "  No ecosystem.config.cjs found — will create one..."
  cat > /opt/curio-crm/ecosystem.config.cjs << 'PMEOF'
module.exports = {
  apps: [{
    name: 'tradetoros-crm',
    script: 'server/index.ts',
    cwd: '/opt/curio-crm',
    exec_mode: 'cluster',
    instances: 'max',
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
    },
    error_file: '/var/log/tradetoros-crm-error.log',
    out_file: '/var/log/tradetoros-crm-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }],
};
PMEOF
  echo "  ✅ ecosystem.config.cjs created"
fi
echo ""

# ── Step 5: Install dependencies if needed ─────────────────
echo "📦 Checking dependencies..."
if [ ! -d /opt/curio-crm/node_modules ]; then
  echo "  Installing dependencies (this may take a few minutes)..."
  cd /opt/curio-crm
  npm ci --production=false 2>&1 | tail -3
else
  echo "  node_modules already exists — skipping install"
fi
echo ""

# ── Step 6: Build frontend ─────────────────────────────────
echo "🔨 Building frontend..."
cd /opt/curio-crm
npm run build 2>&1 | tail -3
echo ""

# ── Step 7: Restart PM2 ────────────────────────────────────
echo "🚀 Restarting CRM via PM2..."
pm2 restart tradetoros-crm 2>/dev/null || pm2 start ecosystem.config.cjs 2>/dev/null || (
  echo "  PM2 not found — starting directly..."
  cd /opt/curio-crm
  NODE_ENV=production npm start &
)
echo ""

# ── Step 8: Verify ─────────────────────────────────────────
echo "══════════════════════════════════════════════════════════"
echo "  ✅ TradeToros CRM configured!"
echo ""
echo "  Backoffice: https://admin.tradetoros.com/admin"
echo "  Public site: https://tradetoros.com"
echo "  Health check: http://216.158.237.213:3002/api/health"
echo ""
echo "  Next steps:"
echo "    1. Fix Cloudflare SSL (set to 'Full' or 'Flexible')"
echo "    2. Update Namecheap DNS if needed"
echo "    3. Login at https://admin.tradetoros.com/admin"
echo "══════════════════════════════════════════════════════════"

ENDSSH

echo ""
echo "🎉 Deploy complete! Check the output above for any issues."
