#!/usr/bin/env bash
# ============================================================
# INIT NEW TRADING SITE — run from blueprint root
# Usage: bash blueprint/init.sh mynewtrading.com
# ============================================================
set -euo pipefail

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <your-new-domain.com>"
  exit 1
fi

echo "=== Initializing new trading site: $DOMAIN ==="

# Set branding
SITE_NAME="${DOMAIN%%.*}"
SITE_TITLE="$(echo "$SITE_NAME" | sed 's/[^a-zA-Z0-9]//g')"

# Create brand config
cat > src/client/tradingBrand.ts << BRAND
export const TRADING_SITE_NAME = "$SITE_TITLE";
export const TRADING_SITE_DOMAIN = "$DOMAIN";
export const TRADING_SITE_TAGLINE = "AI-powered trading intelligence platform";

export const tradingRoutes = {
  home: "/",
  dashboard: "/dashboard",
  trading: "/trading",
  signals: "/signals",
  portfolio: "/portfolio",
  analytics: "/analytics",
  admin: "/admin",
} as const;
BRAND

# Update index.html
sed -i "s/<title>.*<\/title>/<title>$SITE_TITLE<\/title>/" index.html
sed -i "s|apple-mobile-web-app-title\" content=\".*\"|apple-mobile-web-app-title\" content=\"$SITE_TITLE\"|" index.html

# Copy .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env - edit it with your secrets"
fi

echo "=== Site initialized: $SITE_TITLE ($DOMAIN) ==="
echo "Next steps:"
echo "  1. Edit .env with your secrets"
echo "  2. npm install"
echo "  3. npm run build"
echo "  4. Deploy via blueprint/deploy.sh $DOMAIN"
