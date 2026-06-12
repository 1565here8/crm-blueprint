#!/usr/bin/env bash
# ============================================================
# TRADING SITE BLUEPRINT — ONE-CLICK VPS DEPLOY
# Usage:  curl -s https://raw.githubusercontent.com/1565here8/crm-blueprint/main/blueprint/deploy.sh | bash
#   or:   bash blueprint/deploy.sh <your-domain.com>
# ============================================================
set -euo pipefail

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <your-domain.com>"
  echo "Example: $0 mytrading.com"
  exit 1
fi

REPO_URL="https://github.com/1565here8/crm-blueprint.git"
APP_DIR="/opt/trading-site"
SITE_NAME="${DOMAIN%%.*}"

echo "=== Deploying Trading Site Blueprint for: $DOMAIN ==="

# 1. Install dependencies
apt-get update -qq
apt-get install -y -qq curl git nginx nodejs npm certbot python3-certbot-nginx

# 2. Clone repo
rm -rf "$APP_DIR"
git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

# 3. Setup environment
cp .env.example .env
sed -i "s/your-256-bit-hex-secret-here/$(openssl rand -hex 32)/g" .env
sed -i "s/your-128-bit-hex-secret-here/$(openssl rand -hex 16)/g" .env
sed -i "s/your-admin-secret-here/$(openssl rand -hex 12)/g" .env
sed -i "s/NODE_ENV=development/NODE_ENV=production/g" .env
sed -i "s|CORS_ORIGIN=http://localhost:5173|CORS_ORIGIN=https://$DOMAIN|g" .env

# 4. Install npm deps & build
npm install
npm run build

# 5. Setup Nginx
cat > /etc/nginx/sites-available/trading-site << 'NGINX'
server {
    listen 80;
    server_name _;
    return 301 https://$server_name$request_uri;
}
server {
    listen 443 ssl http2;
    server_name _;
    ssl_certificate /etc/letsencrypt/live/REPLACE_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/REPLACE_DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    client_max_body_size 10M;

    add_header X-Robots-Tag "noindex, nofollow";

    # Block Israel (IL) via Cloudflare country header
    if ($http_cf_ipcountry = "IL") { return 403; }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /assets/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

sed -i "s/REPLACE_DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/trading-site
ln -sf /etc/nginx/sites-available/trading-site /etc/nginx/sites-enabled/trading-site
rm -f /etc/nginx/sites-enabled/default

# 6. Get SSL certificate
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || true

# 7. Test & reload nginx
nginx -t && systemctl reload nginx

# 8. Start the app with PM2
npm install -g pm2
pm2 delete trading-crm 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

# 9. Confirm
echo ""
echo "=== DEPLOY COMPLETE ==="
echo "Site: https://$DOMAIN"
echo "Admin: https://$DOMAIN/admin"
echo "App running on port 3001 behind nginx"
echo ""
echo "To check status: pm2 status"
echo "To view logs: pm2 logs trading-crm"
