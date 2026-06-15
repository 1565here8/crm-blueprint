# CRM Blueprint — Plug & Play Broker Platform

```
┌──────────────────────────────────────────────────────────────────┐
│                    CRM BLUEPRINT                                  │
│   One codebase → Any broker → Two surfaces                       │
│                                                                  │
│   ┌─────────────────────┐    ┌─────────────────────────┐         │
│   │  ADMIN CRM           │    │  CLIENT TRADING PORTAL  │         │
│   │  admin.YOURBROKER    │    │  YOURBROKER.com         │         │
│   │  .com/admin          │    │                         │         │
│   │                     │    │  · Trade equities/crypto │         │
│   │  · User management  │    │  · Real-time quotes      │         │
│   │  · CRM + notes      │    │  · Portfolio tracking    │         │
│   │  · Deposits/wires   │    │  · KYC documents         │         │
│   │  · Trading desk     │    │  · Deposit/withdraw      │         │
│   │  · AI concierge     │    │  · Transaction history   │         │
│   │  · Marketing tools  │    │  · AI chat support       │         │
│   │  · Security vault   │    │  · Responsive (mobile)   │         │
│   │  · Commissions      │    │                         │         │
│   └─────────────────────┘    └─────────────────────────┘         │
└──────────────────────────────────────────────────────────────────┘
```

## What This Is

A **turnkey broker platform** — CRM backoffice + client trading portal — that deploys to any domain with zero code changes. Set 3 env vars and you have a fully functional broker platform.

## How It Works (The Magic)

```
Step 1: Buy a domain (e.g., "mybroker.com")
Step 2: Point DNS to your VPS
Step 3: Set env vars:
           PUBLIC_SITE_URL=https://mybroker.com
           ADMIN_URL=https://admin.mybroker.com
           BROKER_NAME=My Broker
Step 4: Deploy
        → admin.mybroker.com/admin  = CRM for broker staff
        → mybroker.com              = Trading portal for clients
```

The system auto-routes based on the incoming `Host` header. No code. No config files. No rebuild.

## Architecture

```
                          ┌─────────────────────┐
                          │     Cloudflare       │
                          │   (SSL termination)  │
                          └─────────┬───────────┘
                                    │
                          ┌─────────▼───────────┐
                          │  Nginx (reverse     │
                          │  proxy, static      │
                          │  assets, cache)     │
                          └─────────┬───────────┘
                                    │ :3002
                          ┌─────────▼───────────┐
                          │  Express API Server  │
                          │  (curio-crm)         │
                          │                      │
                          │  Host detection:     │
                          │  Host header →       │
                          │  isBrokerPublicHost() │
                          │  vs isBrokerAdminHost│
                          │                      │
                          │  Routes:             │
                          │  /api/auth           │
                          │  /api/trade          │
                          │  /api/user           │
                          │  /api/market         │
                          │  /api/admin/*        │
                          │  /api/concierge      │
                          └─────────┬───────────┘
                                    │
                          ┌─────────▼───────────┐
                          │  SQLite             │
                          │  (wallstreet.db)    │
                          │  WAL mode           │
                          └─────────────────────┘
```

## Two User Surfaces

### 1. ADMIN CRM (`admin.<broker>.com/admin`)
| Feature | Description |
|---|---|
| User management | Create, edit, search, filter clients |
| CRM | Notes, emails, activity log, agent assignment |
| Trading desk | Open/close positions, pending orders, trade history |
| Cashier | Deposit requests, wire withdrawals, ledger |
| AI concierge | Ollama-powered client support agent |
| Security | Vault, audit logs, 2FA, permissions |
| Marketing | Drip campaigns, trackers, API keys, partners |
| Commissions | Per-asset-class fee config (fixed/percent/lot) |
| Reports | Sales, deposits, trading activity, balance events |
| System | Settings, account types, countries, payment gateways |

### 2. CLIENT PORTAL (`<broker>.com`)
| Feature | Description |
|---|---|
| Landing page | Branded signup/login |
| Dashboard | Portfolio summary, P&L, buying power |
| Trading | Market data, order entry (market/limit), positions |
| Account | KYC documents, personal details |
| Transactions | Deposit/withdraw history, ledger |
| AI chat | Concierge bubble for support |
| Legal | Terms, privacy, risk disclosures |

## Quickstart — Add a New Broker

### 1. Configure

Edit `deploy/tradetoros/domain-adapter.sh` with your broker's details:

```bash
PUBLIC_DOMAIN="mybroker.com"
ADMIN_SUBDOMAIN="admin.mybroker.com"
BRAND_NAME="My Broker"
BRAND_DISPLAY="MYBROKER"
SUPPORT_EMAIL="support@mybroker.com"
TAGLINE="Trade with confidence"
VPS_IP="YOUR_VPS_IP"
```

### 2. Run

```bash
bash deploy/tradetoros/domain-adapter.sh
```

The script will:
1. SSH into your VPS
2. Create `.env` with your domain config
3. Install deps + build frontend
4. Restart PM2

### 3. Set DNS

| Type | Name | Value |
|---|---|---|
| A | `@` | `YOUR_VPS_IP` |
| A | `www` | `YOUR_VPS_IP` |
| A | `admin` | `YOUR_VPS_IP` |

### 4. Done

```
Public trading:  https://mybroker.com
CRM backoffice:  https://admin.mybroker.com/admin
Health check:    https://mybroker.com/api/health
```

## Env Reference

```
# ── Required (set per broker) ────────────────────────────────
PUBLIC_SITE_URL=https://mybroker.com
ADMIN_URL=https://admin.mybroker.com
CORS_ORIGINS=https://mybroker.com,https://www.mybroker.com,https://admin.mybroker.com

# ── Broker brand (set per broker) ────────────────────────────
BROKER_NAME=My Broker
BROKER_DISPLAY=MYBROKER
BROKER_DOMAIN=mybroker.com
BROKER_SUPPORT_EMAIL=support@mybroker.com
BROKER_TAGLINE=Trade with confidence
BROKER_PRIMARY_COLOR=#0ea5e9
BROKER_ACCENT_COLOR=#f59e0b

# ── Admin credentials ────────────────────────────────────────
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong-password>

# ── Optional ─────────────────────────────────────────────────
OLLAMA_BASE_URL=http://127.0.0.1:11434
ALPACA_API_KEY=
ALPACA_SECRET_KEY=
ELEVENLABS_API_KEY=
```

## Current Deployments

| Broker | Public URL | Admin URL | Status |
|---|---|---|---|
| TradeToros | tradetoros.com | admin.tradetoros.com | Live |
| Curioni Labs | curionilabs.com | curionilabs.com | Internal |

## File Layout

```
crm-blueprint/
├── curio-crm/                      # Full platform codebase
│   ├── server/                     # Express API (88+ modules)
│   │   ├── index.ts                # Server entry
│   │   ├── db.ts                   # SQLite schema + queries
│   │   ├── trading.ts              # Paper trading engine
│   │   ├── desks.ts                # AI desk routing
│   │   ├── marketData.ts           # Yahoo/Binance quotes
│   │   ├── auth.ts                 # JWT auth
│   │   ├── routes/                 # API route handlers
│   │   └── deploy/                 # Deploy scripts
│   ├── src/                        # React frontend
│   │   ├── App.tsx                 # Root: admin vs public routing
│   │   ├── pages/                  # Admin + client pages
│   │   ├── components/             # Shared React components
│   │   ├── context/                # Auth, branding providers
│   │   └── lib/                    # Brand config, site mode
│   └── shared/                     # Shared between server + client
│       └── productHosts.ts         # Env-driven domain router
├── deploy/
│   └── tradetoros/                 # Deploy scripts
│       ├── domain-adapter.sh       # Generic: change vars for any broker
│       └── deploy-to-vps.sh        # Quick deploy to Jersey VPS
└── README.md                       # ← You are here
```

## Key Design Decision: Env-Driven Domains

The critical insight: **one codebase, any domain.** No hardcoded domain lists. Every hostname check reads from `ADMIN_URL` and `PUBLIC_SITE_URL` environment variables.

```typescript
// shared/productHosts.ts
export function isBrokerPublicHost(host: string): boolean {
  const h = normalizeHostname(host);
  const pub = envPublicHostname();  // from PUBLIC_SITE_URL env var
  return pub ? h === pub : false;
}
```

To add a new broker: change `.env` → deploy. **That's it.**

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript 5, Vite 5, Tailwind CSS 3 |
| Backend | Express 4, TypeScript (tsx) |
| Database | SQLite (better-sqlite3, WAL mode) |
| Auth | bcryptjs + JWT |
| AI | Ollama (qwen2.5 models) |
| Trading | Paper engine (Yahoo Finance + Binance quotes) |
| Process | PM2 |
| Server | Ubuntu VPS, Nginx, Cloudflare SSL |
