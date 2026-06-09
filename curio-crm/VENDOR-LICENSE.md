# Curioni Labs vendor license — Desk CRM

Desk CRM stays on the **broker’s VPS**. Curioni Labs keeps a **control plane** that can pause service if payment stops or a clone is detected — without ever receiving client data.

## What this means for you (Curioni Labs)

| You control | How |
|-------------|-----|
| **Who may run the CRM** | Issue a unique `VENDOR_LICENSE_KEY` per broker |
| **Instant pause** | `POST /api/curionilabs/crm-license/revoke` on Jersey host |
| **Clone detection** | Heartbeat includes `domain` — wrong domain auto-revokes |
| **Updates, not copies** | Sell monthly hosting + signed deploys; stale forks miss patches |
| **No broker data on your servers** | Heartbeat payload is metadata only (see below) |

## What the broker gets (privacy)

The broker’s database, chats, KYC files, balances, and AI prompts **never leave their VPS**.

The heartbeat sends **only**:

- `tenantId` — your slug for that broker  
- `domain` — e.g. `crm.theirbrand.com`  
- `buildVersion` — e.g. `0.1.0`  
- Signed timestamp — proves the request is live, not replayed  

Curioni Labs **does not** receive: client names, emails, trades, deposits, staff notes, or vault content.

You can put this in the contract verbatim.

## Broker VPS `.env`

```env
VENDOR_LICENSE_ENABLED=1
VENDOR_LICENSE_URL=https://curionilabs.com/api/curionilabs/crm-license/heartbeat
VENDOR_TENANT_ID=acme-fx
VENDOR_LICENSE_KEY=clk-…issued-by-you…
VENDOR_HEARTBEAT_INTERVAL_MIN=60
VENDOR_LICENSE_GRACE_HOURS=72
ADMIN_IP_ALLOWLIST=203.0.113.10,10.0.0.0/24
```

If the Jersey API is unreachable, the CRM keeps running for `VENDOR_LICENSE_GRACE_HOURS` (default 72h), then pauses.

Set `VENDOR_LICENSE_ENABLED=0` or omit keys for **your own dev** installs.

## Issue a license (Jersey Node — My_network_App)

On the host where `/api/curionilabs/*` runs, set:

```env
CURIONI_CRM_LICENSE_ADMIN_SECRET=your-long-vendor-secret
```

**Issue:**

```http
POST /api/curionilabs/crm-license/issue
Authorization: Bearer your-long-vendor-secret
Content-Type: application/json

{
  "tenantId": "acme-fx",
  "label": "Acme FX Ltd",
  "allowedDomains": ["crm.acmefx.com"]
}
```

Response includes `licenseKey` — send that to the broker **once** (secure channel). Store it in their `.env` as `VENDOR_LICENSE_KEY`.

**Revoke (non-payment / theft):**

```http
POST /api/curionilabs/crm-license/revoke
Authorization: Bearer your-long-vendor-secret

{ "tenantId": "acme-fx", "reason": "Hosting agreement ended." }
```

**Resume after payment:**

```http
POST /api/curionilabs/crm-license/resume
Authorization: Bearer your-long-vendor-secret

{ "tenantId": "acme-fx" }
```

**List all tenants:**

```http
GET /api/curionilabs/crm-license/status
Authorization: Bearer your-long-vendor-secret
```

## Admin perimeter (broker attacks)

On the broker VPS:

- **`ADMIN_IP_ALLOWLIST`** — owner `/admin` login + API only from office/VPN IPs  
- **`STAFF_IP_ALLOWLIST`** + **Enforce staff IP allowlist** in System → Session settings — desk staff blocked from random networks  
- **Security View Log** — blocked logins recorded  
- **Cloudflare WAF** — edge DDoS / bot filtering (see `CLOUDFLARE-REBRAND.md`)

## Owner UI

Super Admin → **Configuration** shows local platform pause **and** Curioni Labs license status (mode, last check, reason).

## Honest limits

A broker with **root + full source** can still patch out the license check. This stack:

1. Stops casual copying and unpaid use  
2. Gives you a **remote kill switch** for hosted/managed deals  
3. Detects **wrong-domain clones** automatically  
4. Keeps **broker privacy** by design (metadata-only heartbeat)

For maximum IP protection, sell **managed hosting** where they never get root or git access.
