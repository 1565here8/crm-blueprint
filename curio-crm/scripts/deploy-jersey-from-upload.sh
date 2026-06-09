#!/bin/bash
# Run ON Jersey after PC uploaded jersey-crm.zip (no GitHub needed). LF line endings only.
set -eu

APP_DIR="/var/www/curiocrm"
ZIP="/tmp/jersey-crm.zip"
PORT="${PORT:-3002}"
PM2_NAME="curiocrm"

if [ ! -f "$ZIP" ]; then
  echo "[jersey] missing $ZIP"
  exit 1
fi

mkdir -p "$APP_DIR"
cd "$APP_DIR"
echo "[jersey] clearing stale files (keep .env + data/)..."
find "$APP_DIR" -mindepth 1 -maxdepth 1 ! -name '.env' ! -name 'data' -exec rm -rf {} +
echo "[jersey] unpacking..."
if ! command -v unzip >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y -qq unzip
fi
unzip -qo "$ZIP" -d "$APP_DIR"

if [ ! -f .env ]; then
  cp scripts/jersey-curionilabs.env.example .env
fi
if grep -qE 'change-me|CHANGE_ME' .env 2>/dev/null; then
  SEC=$(openssl rand -hex 24)
  APW="crm-$(openssl rand -hex 8)"
  sed -i "s/change-me-long-random-32-chars-minimum/$SEC/" .env
  sed -i "s/change-me-strong/$APW/" .env
  echo "[jersey] login: owner / $APW"
fi

export SKIP_DESK_PROVISION=1
export NODE_ENV=production

if ! command -v node >/dev/null 2>&1; then
  echo "[jersey] installing node 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

echo "[jersey] npm ci + build (may take 10+ min)..."
npm ci --include=dev
npm run build
test -f dist/index.html

pm2 delete curionilabs 2>/dev/null || true
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  PORT="$PORT" pm2 restart "$PM2_NAME" --update-env
else
  PORT="$PORT" pm2 start npm --name "$PM2_NAME" -- start
fi
pm2 save

i=1
while [ "$i" -le 12 ]; do
  if curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
    curl -fsS "http://127.0.0.1:${PORT}/api/health"
    echo ""
    echo "[jersey] CRM OK on port $PORT"
    if [ -f scripts/jersey-ensure-demo-client.mjs ]; then
      node scripts/jersey-ensure-demo-client.mjs || true
    fi
    if [ -f scripts/jersey-apply-mobile-trader-nginx.sh ]; then
      sed -i 's/\r$//' scripts/jersey-apply-mobile-trader-nginx.sh
      chmod +x scripts/jersey-apply-mobile-trader-nginx.sh
      bash scripts/jersey-apply-mobile-trader-nginx.sh || true
    fi
    exit 0
  fi
  sleep 3
  i=$((i + 1))
done
echo "[jersey] health failed"
pm2 logs "$PM2_NAME" --lines 40 --nostream || true
exit 1
