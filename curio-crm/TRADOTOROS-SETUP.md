# TradeToros CRM — Backoffice Setup Guide

## Quick Start

### 1. DNS Configuration (Cloudflare)

Add these DNS records for `tradetoros.com`:

| Type    | Name              | Value / Target          | Proxy   |
|---------|-------------------|-------------------------|---------|
| CNAME   | `admin`           | `curionilabs.com`       | Proxied |
| CNAME   | `www`             | `tradetoros.com`        | Proxied |
| A       | `@` (root)        | `216.158.237.213`       | Proxied |

### 2. Environment Variables

Copy `.env.tradetoros` and customize:

```bash
cp .env.tradetoros .env
# Edit .env with your admin credentials & secrets
```

Key variables:
- `PUBLIC_SITE_URL=https://tradetoros.com` — client-facing site
- `ADMIN_URL=https://admin.tradetoros.com` — backoffice URL
- `CORS_ORIGINS=https://tradetoros.com,https://www.tradetoros.com,https://admin.tradetoros.com`

### 3. Deploy Locally (Development)

```bash
cd /Users/mymac/GitHub-Projects/curio-crm
cp .env.tradetoros .env.local
npm install
npm run dev
```

The CRM will be available at:
- **Backoffice:** http://localhost:5173/admin
- **Public site:** http://localhost:5173 (shows TradeToros landing)

### 4. Deploy to Render (Production)

#### Option A — Blueprint Deploy (Recommended)

1. Go to [render.com](https://render.com) → **New → Blueprint**
2. Connect your GitHub repo
3. Set these environment variables:
   ```
   NODE_ENV=production
   PUBLIC_SITE_URL=https://tradetoros.com
   ADMIN_URL=https://admin.tradetoros.com
   CORS_ORIGINS=https://tradetoros.com,https://www.tradetoros.com,https://admin.tradetoros.com
   ADMIN_USERNAME=<your-admin-username>
   ADMIN_PASSWORD=<your-strong-password>
   SESSION_SECRET=<generate-random-64-char-string>
   ```
4. Click **Apply**

#### Option B — Manual Upload to GitHub

1. Run `pack-for-github.ps1` (PowerShell) or create zip manually
2. Create a private GitHub repo
3. Upload the zip contents
4. Connect to Render Blueprint (see Option A step 2-5)

### 5. Database Branding

After first login, set TradeToros branding in the CRM:

1. Login to backoffice at `https://admin.tradetoros.com/admin`
2. Navigate to **System → Common → Branding**
3. Set:
   - **CRM Brand Name:** TRADETOROS
   - **Go to Site URL:** https://tradetoros.com
   - **Go to Site Label:** Go to Trading Site

## Backoffice Features

The TradeToros backoffice includes all CRM modules:

| Module | Route | Description |
|--------|-------|-------------|
| **Dashboard** | `/admin` | Mission Control — live stats, registrations, treasury |
| **Users** | `/admin/crm/users` | Client management, status, KYC |
| **Desk** | `/admin/desk` | AI-powered lead management & communication |
| **Desk Leads** | `/admin/desk/leads` | Lead inbox & assignment |
| **Trading** | `/admin/trading` | Open trades, trade history, positions |
| **Cashier** | `/admin/cashier/deposits` | Deposits, withdrawals, wire requests |
| **Settings** | `/admin/settings` | Platform configuration |
| **Security** | `/admin/security` | DNS, SSL, perimeter, audit logs |
| **Automation** | `/admin/automation` | Marketing automation studio |
| **Integrations** | `/admin/integrations` | MT4/MT5 bridge, broker OS |
| **Broker OS** | `/admin/broker-os` | Broker configuration hub |
| **Commission** | `/admin/system/forex-commissions` | Forex & crypto commission rates |
| **Spread** | `/admin/system/spread` | Spread profiles management |

## Domain Verification

After DNS propagates, verify:

```bash
# Check DNS
nslookup admin.tradetoros.com
nslookup tradetoros.com

# Verify HTTPS
curl -I https://admin.tradetoros.com
curl -I https://tradetoros.com
```

## Troubleshooting

### Admin page shows "Server unavailable"
- Check Render deployment status
- Verify DNS records are proxied (orange cloud)
- Purge Cloudflare cache: **Cloudflare → Caching → Purge Everything**

### CORS errors in browser console
- Ensure `CORS_ORIGINS` includes all domains
- Check `ADMIN_URL` matches your actual admin domain

### Branding not showing TradeToros colors
- Clear browser cache (Ctrl+F5)
- Verify branding settings in System → Common → Branding
- Check `.env` has correct `PUBLIC_SITE_URL` and `ADMIN_URL`
