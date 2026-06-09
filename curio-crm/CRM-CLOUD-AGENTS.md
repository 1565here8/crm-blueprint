# CurioCRM — parallel Cloud Agents (6 slots)

Use **six separate** [Cloud Agent](https://cursor.com/agents) runs so CRM work finishes faster. Each agent owns one slice — no overlap.

**Repo:** `wallstreet-sim` on your Desktop (or GitHub remote for that project).  
**Rule:** Build and test in the cloud only; open a PR per agent.

## Quick start

```bat
cd C:\Users\torah\Desktop\My_network_App
node scripts\crm-cloud-agents.mjs
node scripts\crm-cloud-agents.mjs --open 6
```

Paste **one** prompt below into each Agent tab.

---

## Agent 1 — System placeholders → real pages

Replace `SystemPlaceholderPage` stubs with working UI for: **feeds**, **cascading-limits**, **cascading-items**, **platform-admin**, **refresh-trades**. Wire routes in `AdminRoutes.tsx`, add API in `server/`, guides in `systemSectionGuides.ts`. Match existing System pages (Countries, Processors). PR title: `crm: system feeds and cascading`.

---

## Agent 2 — Payment gateway tabs

Implement remaining **payment-gateways** nested tabs (not test-cards/processors). Use `PaymentGatewaysLayout`, `paymentGatewayGuides.ts`, server `paymentGateways.ts`. PR title: `crm: payment gateway modules`.

---

## Agent 3 — Marketing placeholders

Replace `MarketingPlaceholderPage` for **Campaign Pivot**, **Affiliate Managers**, **Push To Web** with real pages in `MarketingPages.tsx` + server routes. Follow patterns from Campaigns/Partners. PR title: `crm: marketing pivot and affiliates`.

---

## Agent 4 — Cashier & funding

Finish **funding** route (`AdminPage` stub) and harden cashier: deposits, wire-req, deposit-requests, ledger. Server routes under `server/`, admin under `src/pages/admin/cashier/`. PR title: `crm: cashier and funding`.

---

## Agent 5 — CRM users & desk

Improve **All Clients** (`UsersPage`, `crmUsers.ts`): filters, bulk assign, desk scoping, `PageBottomGuide` on CRM list pages. Desk: leads inbox, tasks, PSP health. PR title: `crm: users desk polish`.

---

## Agent 6 — Deploy & guides

Add missing **PageBottomGuide** on any admin page without one. Run cloud build, fix TS errors, update `crmPageTutorials.ts` / `crmGuideKnowledge.ts`. Confirm `scripts/deploy-vps.sh` path. PR title: `crm: guides and build green`.

---

## After agents finish

1. Review and merge PRs (or rebase one branch if you prefer).  
2. Deploy from `wallstreet-sim` to VPS.  
3. Check `https://admin.etoropros.com/admin`.
