# ╔══════════════════════════════════════════════════════════╗
# ║   CRM Platform — Plug & Play Domain Adapter             ║
# ║   Deploy any broker CRM to any domain in 5 minutes       ║
# ╚══════════════════════════════════════════════════════════╝

## Quick Start (3 Steps)

### Step 1: Fill in the config
Edit `domain-adapter.sh` — change these 4 lines at the top:

```bash
PUBLIC_DOMAIN="tradetoros.com"        # Your public domain
ADMIN_SUBDOMAIN="admin.tradetoros.com" # Your admin subdomain
BRAND_NAME="TradeToros"               # Display name
VPS_IP="216.158.237.213"             # Your Jersey VPS IP
```

### Step 2: Run the deploy script
```bash
cd /Users/mymac/GitHub-Projects/curio-crm/deploy/tradetoros
./domain-adapter.sh
```

That's it. The script will:
1. SSH into your VPS
2. Write `.env` with your domain config
3. Build the frontend
4. Restart PM2
5. Verify everything works

### Step 3: Configure DNS (Namecheap or Cloudflare)

#### If using Namecheap:
Add these DNS records for `tradetoros.com`:

| Type | Host | Value/Target | TTL |
|------|------|--------------|-----|
| A | @ | 216.158.237.213 | Automatic |
| CNAME | www | @ | Automatic |
| CNAME | admin | @ | Automatic |

Then set up SSL:
- Option A: Use **Namecheap SSL** (PositiveSSL) + install on VPS with certbot
- Option B: Point to Cloudflare (see below)

#### If using Cloudflare (recommended):
1. Change nameservers to Cloudflare's
2. Add DNS records:
   - `tradetoros.com` → A → `216.158.237.213` (proxied/orange cloud)
   - `www.tradetoros.com` → CNAME → `tradetoros.com` (proxied)
   - `admin.tradetoros.com` → CNAME → `tradetoros.com` (proxied)
3. SSL/TLS mode → **Full** (or **Flexible** if no cert on VPS)

---

## What Gets Deployed

| Component | URL | Description |
|-----------|-----|-------------|
| Public Landing | `https://tradetoros.com` | Beautiful broker landing page |
| CRM Backoffice | `https://admin.tradetoros.com/admin` | Full CRM with login |
| API Backend | `http://216.158.237.213:3002` | Express server + SQLite |

---

## CRM Backoffice Features

Once logged in at `https://admin.tradetoros.com/admin`:

- **Dashboard** — Live stats, registrations, treasury
- **Users** — Client management, KYC, status pipeline
- **Desk** — AI-powered lead management & communication
- **Trading** — Open trades, positions, history
- **Cashier** — Deposits, withdrawals, wire requests
- **Settings** — Platform config, branding, commissions
- **Security** — DNS, SSL, perimeter, audit logs
- **Automation** — Marketing automation studio
- **Integrations** — MT4/MT5 bridge, broker OS

---

## Troubleshooting

### "526 SSL handshake failed" on admin domain
```bash
# Fix: Set Cloudflare SSL/TLS mode to "Full" or "Flexible"
# Or install certbot on VPS:
sudo apt update && sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d admin.tradetoros.com -d tradetoros.com
```

### CRM not showing TradeToros branding
```bash
# SSH into VPS and check .env
ssh root@216.158.237.213
cat /opt/curio-crm/.env | grep PUBLIC_SITE_URL
cat /opt/curio-crm/.env | grep ADMIN_URL

# Restart PM2
pm2 restart tradetoros-crm
```

### CORS errors in browser console
Check `CORS_ORIGINS` in `.env` includes all your domains.

---

## Deploying to a NEW Domain (Next Time)

Just copy this folder, change the 4 config variables at the top of `domain-adapter.sh`, and run:

```bash
# 1. Edit config
nano domain-adapter.sh   # Change PUBLIC_DOMAIN, ADMIN_SUBDOMAIN, etc.

# 2. Run deploy
./domain-adapter.sh

# 3. Update DNS (Namecheap or Cloudflare)
# Add A/CNAME records pointing to your VPS IP

# Done! 🎉
```

No building, no coding — just config + DNS = live CRM.
