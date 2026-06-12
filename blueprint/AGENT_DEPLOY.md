# ============================================================
# AGENT DEPLOY INSTRUCTIONS — CRM+TRADING BLUEPRINT
# ============================================================
# This file tells AI agents how to deploy this blueprint.
# To deploy a new trading site:

## QUICK DEPLOY (from any machine)
# curl -s https://raw.githubusercontent.com/1565here8/crm-blueprint/main/blueprint/deploy.sh | bash -s yourdomain.com

## MANUAL DEPLOY STEPS FOR AGENTS:
# 1. Clone:     git clone https://github.com/1565here8/crm-blueprint.git /opt/trading-site
# 2. Setup:     cd /opt/trading-site && cp .env.example .env
# 3. Secrets:   Edit .env (JWT_SECRET, CSRF_SECRET, ADMIN_SECRET)
# 4. Install:   npm install
# 5. Build:     npm run build
# 6. Nginx:     Copy blueprint/templates/nginx.conf → /etc/nginx/sites-available/
# 7. SSL:       certbot --nginx -d yourdomain.com
# 8. PM2:       pm2 start ecosystem.config.cjs
# 9. Reload:    nginx -t && systemctl reload nginx

## AGENT CHECKLIST:
# [ ] Clone repo to /opt/trading-site
# [ ] Generate secrets for .env
# [ ] npm install && npm run build
# [ ] Configure nginx with SSL
# [ ] PM2 process running (port 3001)
# [ ] Site responds at https://yourdomain.com
# [ ] Admin at https://yourdomain.com/admin

## SYSTEM ARCHITECTURE:
# Client:   React SPA (Vite, Tailwind)
# Server:   Express.js API on port 3001
# Proxy:    Nginx on 80/443 → localhost:3001
# Session:  JWT in httpOnly cookie
# DB:       SQLite at .data/store.sqlite (or PostgreSQL)
# AUTH:     Anonymous bootstrap + admin secret login

## ENVIRONMENT VARIABLES (in .env):
# PORT=3001
# NODE_ENV=production
# JWT_SECRET=<random hex>
# CSRF_SECRET=<random hex>
# ADMIN_SECRET=<admin password>
# CORS_ORIGIN=https://yourdomain.com
