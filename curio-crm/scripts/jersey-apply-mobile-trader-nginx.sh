#!/bin/bash
# Apply Curioni mobile trader nginx (trader.curionilabs.com + www /mobile proxy). Run on Jersey as root.
set -eu
APP_DIR="${APP_DIR:-/var/www/curiocrm}"
CONF_SRC="$APP_DIR/scripts/jersey-nginx-curiocrm.conf"
SITE=/etc/nginx/sites-available/curiocrm

if [ ! -f "$CONF_SRC" ]; then
  echo "[mobile-trader] missing $CONF_SRC — deploy CRM first"
  exit 1
fi

cp "$CONF_SRC" "$SITE"
ln -sf "$SITE" /etc/nginx/sites-enabled/curiocrm
nginx -t
systemctl reload nginx
echo "[mobile-trader] nginx reloaded"

if command -v certbot >/dev/null 2>&1; then
  certbot --nginx -d trader.curionilabs.com --non-interactive --agree-tos --register-unsafely-without-email --expand 2>/dev/null || \
    bash "$APP_DIR/scripts/jersey-certbot-curiocrm.sh" || true
fi

curl -fsS "http://127.0.0.1:3002/api/health" && echo ""
curl -fsSI "http://127.0.0.1:3002/mobile/" | head -n 1 || true
echo "[mobile-trader] done — https://trader.curionilabs.com"
