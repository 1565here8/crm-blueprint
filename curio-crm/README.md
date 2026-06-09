# CurioCRM

US equities (NYSE/NASDAQ) and crypto **paper trading** — unlimited users, **$0 per user**.

## Zero-cost model

| What | Cost |
|------|------|
| **Unlimited users** | **$0** — stored in local SQLite, no broker account per user |
| **User balances & trades** | **$0** — internal ledger, not Alpaca sub-accounts |
| **US stock quotes** | **$0** — Yahoo Finance (pre-market, regular, after-hours ET) |
| **Crypto quotes** | **$0** — Binance public API (24/7, no API key) |
| **Optional upgrade** | Free Alpaca **paper** keys (one shared account for the whole platform) |

You never pay per user. You never need a paid market-data subscription for v1.

## Market hours covered

| Market | Hours |
|--------|--------|
| **NYSE / NASDAQ** | Pre-market 4:00–9:30 AM ET · Regular 9:30 AM–4:00 PM ET · After-hours 4:00–8:00 PM ET |
| **Crypto** | **24/7** — always open |

## Features

- **Admin panel** — create unlimited users, add/remove cash, open trades for clients
- **User terminal** — trade US stocks & crypto, close positions, withdraw → platform credits
- **Live watchlist** — refreshes every few seconds from free feeds

> **Not real money.** Simulated USD only. Withdrawals convert to in-app credits.

## Quick start

```powershell
cd C:\Users\torah\Desktop\wallstreet-sim
copy .env.example .env
npm install
npm run dev
```

Open **http://localhost:5180**

### Admin credentials

1. Copy `.env.example` to `.env` if you have not already.
2. Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` to strong values **before the first run** (when `data/wallstreet.db` is empty).
3. Log in at **http://localhost:5180/admin** with those values.

If an admin account already exists and you need to reset it:

```powershell
npx tsx scripts/set-admin.ts your-admin-username your-strong-password
```

Never commit `.env` — it is listed in `.gitignore`. Only `.env.example` (with placeholders) belongs in the repo.

## Optional: Alpaca paper keys

One free Alpaca paper account can back up quotes if Yahoo/Binance fail. Still **one account for everyone** — not one per user.

```
ALPACA_API_KEY=your_paper_key
ALPACA_SECRET_KEY=your_paper_secret
```

## Architecture

```
Unlimited users → SQLite (free)
       ↓
Internal ledger + positions (free)
       ↓
Shared quote feeds (Yahoo + Binance, free)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API :3002 + UI :5180 |
| `npm run typecheck` | TypeScript check |
