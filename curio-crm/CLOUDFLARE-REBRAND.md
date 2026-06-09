# Cloudflare abuse — rebrand deployed

Reports: trademark **30a40fcb69ba2cf9** (admin), phishing **14f13753f06da1dc** (www blocked).

## What we changed (code)

- Logo: single word **Etoropros** (no split “eToro” styling)
- Teal accent **#14b8a6** (not third-party broker green)
- Removed copy-trading / social-trading pitch and “eToro-inspired” FAQ
- Footer + meta: **not affiliated with eToro Group Ltd or etoro.com**

Public demo copy states **demo only**, **simulated trading**, and **not affiliated with eToro**. See [DEMO-LAUNCH.md](./DEMO-LAUNCH.md) to put www live (`PUBLIC_SITE_REBRANDING=0`).

## Request review (Cloudflare)

1. https://dash.cloudflare.com → Abuse reports → **14f13753f06da1dc** → Request review  
2. Email **abusereply@cloudflare.com** — subject includes report ID

Suggested line:

> Etoropros is an independent white-label broker demonstration platform. We are not affiliated with, endorsed by, or impersonating eToro Group Ltd or etoro.com. We removed confusing branding (split wordmark, social/copy-trading messaging, and third-party green styling). The site is for authorized demos only.

## Deploy

Public **www** demo: `PUBLIC_SITE_REBRANDING=0` (repo default). Admin unchanged. Details: **[DEMO-LAUNCH.md](./DEMO-LAUNCH.md)**.

```bash
cd /var/www/etoropros
git pull origin main
bash scripts/deploy-vps.sh
pm2 restart etoropros --update-env
```

## Note on the domain name

`etoropros` still contains the substring `etoro`. Long term, consider a domain without that string (e.g. **curionilabs.com**) if complaints continue.
