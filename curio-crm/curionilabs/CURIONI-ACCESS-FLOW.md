# Curioni access flow (email approve)

## How it works

1. **Visitor** submits **Request access** on https://curionilabs.com
2. **You** get email at **CURIONI_CONTACT_INBOX** (Zoho) with applicant details + **copy-ready access code**
3. **You click** → that email is saved as approved
4. **Visitor** gets email: sign in with the same address
5. **Visitor** opens site → **Member sign-in** → enters email → sees **hub** (`/curionilabs`)

No manual codes in `.env`.

## Server required

Static GitHub Pages only shows the form. The **API must run** on a Node host (e.g. `hub.curionilabs.com`).

In `.env` on that server:

```env
CURIONI_CONTACT_INBOX=you@yourdomain.zoho.com
CURIONI_PUBLIC_URL=https://hub.curionilabs.com
CURIONI_HUB_URL=https://hub.curionilabs.com/curionilabs
CURIONI_COOKIE_DOMAIN=.curionilabs.com
CORS_ORIGIN=https://curionilabs.com,https://www.curionilabs.com
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=Curioni Labs <noreply@curionilabs.com>
```

Landing page meta (already in `curionilabs-landing/index.html`):

```html
<meta name="curioni-api" content="https://hub.curionilabs.com" />
```

Point `hub.curionilabs.com` DNS (Cloudflare) to the VPS running `My_network_App`.
