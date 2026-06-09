# Broker pitch — CurioCRM / Xtoropro (one page)

**One sentence they repeat:** *"Our client data and desk AI never leave our metal — one sovereign stack from signup to payout, live in 48 hours."*

## Problem (IPO / institutional desk)

- Lead → assign → deposit → trade → payout split across Salesforce, spreadsheets, and a legacy portal.
- Compliance asks **where PII, KYC, and AI prompts live** — answer is "several US SaaS vendors."
- Desk AI bolted on = prompts and client context leak to third-party LLM APIs.

## What you ship (honest)

| Layer | What it is |
|-------|------------|
| **Public** | White-label broker site (`www.*`) — Etoropros demo zone or full Xtoropro |
| **CRM** | CurioCRM on `crm.*` — Mission Control, Hot Leads, Cashier, Trading, Marketing, System |
| **AI** | Street AI + KNOWME on the **same VPS** (Ollama); instant fast-path works if LLM sleeps |
| **Control** | Curioni Labs vendor license (metadata heartbeat only) + tenant billing gate |

See: `PRODUCT-SPLIT.md`, `THE-CRM.md`, `VENDOR-LICENSE.md`, `POLISH-READY.md`.

## Sovereign story (contract language)

From `VENDOR-LICENSE.md` — broker DB, chats, KYC files, balances, and AI prompts **do not leave their VPS**. Heartbeat sends only: `tenantId`, `domain`, `buildVersion`, signed timestamp. **No** client names, emails, trades, or vault content to Curioni Labs.

Perimeter: `ADMIN_IP_ALLOWLIST`, staff IP allowlist, Security View Log, Cloudflare WAF.

## vs Salesforce / generic SaaS CRM

| Them | You |
|------|-----|
| CRM is one tab; portal/treasury elsewhere | Portal + desk + treasury + risk in **one** codebase |
| AI = external API | Street AI **native** to `/admin/desk` |
| Data in vendor cloud | Data on **broker VPS** |
| Custom = $$$ SI | White-label host + Brand DNA |

## Deploy in 48h

1. Issue `VENDOR_LICENSE_KEY` (Jersey control plane — `VENDOR-LICENSE.md`).
2. VPS `.env`: `PUBLIC_SITE_URL`, `ADMIN_URL`, license keys, allowlists.
3. `git push` → GitHub Actions → `scripts/deploy-vps.sh`.
4. `sh scripts/broker-demo-preflight.sh` before the CEO call.

## Licensing / pricing angle (no fake numbers)

- **Managed hosting** (recommended): monthly fee + license; broker never gets root — best IP protection.
- **Self-hosted license**: `VENDOR_LICENSE_KEY` per broker; you can revoke / detect domain clones.
- **Tenant pause**: `tenant_status` billing kill-switch (separate from vendor license).
- Sell **updates**, not source forks — stale clones miss patches.

## Gaps → week 2 (say aloud)

- **KYC vault UI** — encrypted vault API exists; operator-facing vault UI in progress (Client File flag + AI bubble for docs today).
- **Regulatory export pack** — Event Logs, Full Ledger, History Logs exist; packaged MiFID-style exports next.
- **PRO_STATS on public hero** — marketing placeholders on `SiteLandingSections`; replace with broker-approved figures at handoff.

## 15-min IPO desk demo script

1. **Mission Control** (`/admin`) — registrations + money cards (period = today).
2. **Live Floor** — visitor on site now; tie to Hot Leads.
3. **Hot Leads** — Aria capture → assign (golden path starts).
4. **Pending In** — approve one deposit; **Credits In** verify.
5. **Live Book** + **Desk Management** — open risk narrative.
6. **Street AI** — `demo tour` → `morning routine` → **Operator Brief** (LLM if `/api/ready` ollama:true).
7. **KNOWME** — Visual Flow slide 1 (golden path) for the CEO.
8. Close: **Configuration** — vendor license panel + tenant status (sovereign control proof).

## Preflight

```sh
CRM_BASE=https://crm.xtoropro.com sh scripts/broker-demo-preflight.sh
```

## Live demo magic lines (Street AI)

- `broker pitch` / `why xtoropro` / `why curio` — instant sovereign answer (no LLM wait).
- `pass the test` / `vendor license` — survival + compliance gates.
- `demo tour` — full CRM walk.

---

*Curioni Labs · wallstreet-sim · Not affiliated with eToro Group Ltd.*
