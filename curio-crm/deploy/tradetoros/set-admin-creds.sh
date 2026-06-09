#!/bin/bash
# ╔══════════════════════════════════════════════════════════╗
# ║   Set CRM Admin Credentials on Jersey VPS               ║
# ║   Just run: ./set-admin-creds.sh                        ║
# ╚══════════════════════════════════════════════════════════╝

set -euo pipefail

VPS_USER="root"
VPS_IP="216.158.237.213"

# ── Your credentials (change these) ────────────────────────
NEW_USERNAME="admin"
NEW_PASSWORD="iamamoneymagnet"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Setting CRM Admin Credentials on Jersey VPS           ║"
echo "║   Username: $NEW_USERNAME                                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Find the .env file and update it ───────────────────────
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << ENDSSH

# Find CRM directory
CRM_DIR=\$(find /opt /srv /root /home -maxdepth 3 -name "server" -type d 2>/dev/null | grep -i "crm\\|wallstreet\\|curio" | head -1)

if [ -z "\$CRM_DIR" ]; then
  # Try common locations
  for dir in /opt/curio-crm /opt/wallstreet-sim /root/curio-crm /root/wallstreet-sim; do
    if [ -d "\$dir" ] && [ -f "\$dir/server/index.ts" ]; then
      CRM_DIR="\$dir"
      break
    fi
  done
fi

if [ -z "\$CRM_DIR" ]; then
  echo "❌ CRM directory not found on VPS"
  exit 1
fi

echo "  Found CRM at: \$CRM_DIR"

# Find or create .env
ENV_FILE=""
for f in "\$CRM_DIR/.env" "\$CRM_DIR/server/.env" "\$CRM_DIR/.env.production"; do
  if [ -f "\$f" ]; then
    ENV_FILE="\$f"
    break
  fi
done

if [ -z "\$ENV_FILE" ]; then
  ENV_FILE="\$CRM_DIR/.env"
  echo "  Creating new .env at \$ENV_FILE"
fi

echo "  Updating credentials in \$ENV_FILE"

# Update or add ADMIN_USERNAME and ADMIN_PASSWORD
if [ -f "\$ENV_FILE" ]; then
  # Update existing lines or append
  if grep -q "^ADMIN_USERNAME=" "\$ENV_FILE" 2>/dev/null; then
    sed -i "s/^ADMIN_USERNAME=.*/ADMIN_USERNAME=$NEW_USERNAME/" "\$ENV_FILE"
  else
    echo "ADMIN_USERNAME=$NEW_USERNAME" >> "\$ENV_FILE"
  fi

  if grep -q "^ADMIN_PASSWORD=" "\$ENV_FILE" 2>/dev/null; then
    sed -i "s/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=$NEW_PASSWORD/" "\$ENV_FILE"
  else
    echo "ADMIN_PASSWORD=$NEW_PASSWORD" >> "\$ENV_FILE"
  fi
else
  cat > "\$ENV_FILE" << ENVEOF
NODE_ENV=production
PORT=3002
TRUST_PROXY=1
SESSION_SECRET=\$(openssl rand -hex 32)
ADMIN_USERNAME=$NEW_USERNAME
ADMIN_PASSWORD=$NEW_PASSWORD
PUBLIC_SITE_URL=https://tradetoros.com
ADMIN_URL=https://admin.tradetoros.com
CORS_ORIGINS=https://tradetoros.com,https://www.tradetoros.com,https://admin.tradetoros.com
ENVEOF
fi

echo "  ✅ Credentials updated"

# ── Restart PM2 to pick up new env vars ────────────────────
echo ""
echo "  🔄 Restarting CRM server..."

# Try PM2 first
if pm2 list 2>/dev/null | grep -q "crm\\|wallstreet\\|curio"; then
  pm2 restart all 2>/dev/null && echo "  ✅ PM2 restarted" || true
else
  # Try to find and restart the process
  for name in tradetoros-crm curio-crm wallstreet-sim crm-platform; do
    if pm2 list 2>/dev/null | grep -q "\$name"; then
      pm2 restart "\$name" && echo "  ✅ PM2 restarted: \$name" && break
    fi
  done
fi

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  ✅ Admin credentials set!"
echo ""
echo "  Username: $NEW_USERNAME"
echo "  Password: $NEW_PASSWORD"
echo ""
echo "  Login at: http://216.158.237.213:3002/admin"
echo "  Or via Cloudflare: https://admin.tradetoros.com/admin"
echo "══════════════════════════════════════════════════════════"

ENDSSH
