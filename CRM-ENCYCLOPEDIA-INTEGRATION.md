# CRM in-app encyclopedia (ANTARIMARKETSO / etoropros)

Plain-language help for **every admin page**, reverse-engineered from your **Error Logs** screen and standard affiliate/trading CRM flows.

## Files (copy to the CRM server)

Upload the folder `public/crm-encyclopedia/` from this repo to the CRM web root, e.g.:

`https://yoursite.com/crm-encyclopedia/`

| File | Purpose |
|------|---------|
| `encyclopedia.json` | All page text — edit here when menus change |
| `index.html` | Full encyclopedia (search + sidebar) |
| `help-widget.js` + `help-widget.css` | Floating **?** button on every CRM page |

## One-time embed in PHP layout (all pages)

In your main admin layout (Twig/PHP), before `</body>`:

```html
<script
  src="/crm-encyclopedia/help-widget.js"
  data-crm-page="PUT_PAGE_ID_HERE"
  data-base="/crm-encyclopedia/"></script>
```

(`help-widget.js` injects the CSS automatically.)

Set `data-crm-page` per route:

| CRM menu | `data-crm-page` |
|----------|-----------------|
| Dashboard | `dashboard` |
| CRM | `crm` |
| Cashier | `cashier` |
| Trading | `trading` |
| Marketing | `marketing` |
| Online | `online` |
| Payment Gateways | `payment-gateways` |
| Super Admin → Configuration | `super-admin-configuration` |
| Super Admin → **Error Logs** | `super-admin-error-logs` |
| Super Admin → SMTP Logs | `super-admin-smtp-logs` |
| Super Admin → Balance events | `super-admin-balance-events` |
| Super Admin → **Order Storage Logs** | `super-admin-order-storage-logs` |

## Error Logs — per-button tooltips

On the Error Logs template, add attributes to each button (labels must match `encyclopedia.json` action `id`):

```html
<button data-crm-help-action="clear-logs">Clear Logs</button>
<button data-crm-help-action="update-risks">Update Risks</button>
<button data-crm-help-action="update-risks-priority">Update Risks Priority</button>
<button data-crm-help-action="update-campaign-earnings">Update campaign earnings</button>
<button data-crm-help-action="update-partner-username">Update Partner Username</button>
<button data-crm-help-action="update-qftd-status">update qftd status</button>
<button data-crm-help-action="revshare-hotfix">revshare hotfix</button>
<button data-crm-help-action="convert-to-ftd">convert to ftd</button>
<button data-crm-help-action="tracking-update">tracking update</button>
```

A small **?** appears next to each button; click for a mini explanation without leaving the page.

## Preview from Cerebelix / Network Core

If this Node app serves `public/`:

- Full book: `http://YOUR_HOST/public/crm-encyclopedia/index.html` (when served from this repo’s Express `public` mount)
- Error Logs widget test: add a static test page or open encyclopedia and pick **Error Logs** in the sidebar

## Customize

1. Open `encyclopedia.json`.
2. Add a `pages[]` entry for any submenu we did not list (copy an existing block).
3. Bump `version` when you ship to production.

**Note:** The live ANTARIMARKETSO PHP CRM is not in this git repo (`etoropros.com` / `toropros` server). This package is ready to drop into that CRM’s `public_html`.
