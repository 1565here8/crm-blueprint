#!/bin/bash
set -eu
DOMAINS="admin.curionilabs.com,curionilabs.com,www.curionilabs.com,hub.curionilabs.com,trader.curionilabs.com"
if ! getent hosts admin.curionilabs.com >/dev/null 2>&1; then
  echo "[jersey] DNS not ready for admin.curionilabs.com yet"
  exit 2
fi
apt-get install -y -qq certbot python3-certbot-nginx 2>/dev/null || true
certbot --nginx -d admin.curionilabs.com -d curionilabs.com -d www.curionilabs.com -d hub.curionilabs.com -d trader.curionilabs.com \
  --non-interactive --agree-tos --register-unsafely-without-email --redirect
nginx -t && systemctl reload nginx
echo "[jersey] HTTPS OK"
curl -fsS https://admin.curionilabs.com/api/health
