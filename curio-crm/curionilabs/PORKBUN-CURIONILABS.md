# curionilabs.com — already on Porkbun Static Hosting

**You already have hosting.** DNS points at Porkbun (`www` → `uixie.porkbun.com`). HTTPS is automatic.

The parking page shows because **`dist/` was never uploaded** — not because you need a VPS.

---

## Upload the landing (2 minutes)

### A. One-click (after FTP creds saved)

1. Porkbun → **curionilabs.com** → **Static Hosting** → copy **FTP Credentials**
2. Copy `.env.porkbun.example` → `.env.porkbun` and paste host / user / password
3. Double-click **`DEPLOY-CURIONILABS-HTTPS.bat`**

It builds and FTP-uploads `dist/` to your static host.

### B. Manual (Porkbun file manager)

```powershell
cd C:\Users\torah\Desktop\wallstreet-sim\curionilabs
npm run build
```

Static Hosting → upload **`dist/index.html`** (invite gate only).

---

## Check live

```text
https://curionilabs.com
https://www.curionilabs.com
```

You should see the **Curioni Labs invitation gate** (eyebrow: *worldclass solutions for the elite*), not Desk CRM marketing or “A Brand New Domain!”.

---

## Invitation requests

On **Jersey VPS** (My_network_App + `public/curionilabs.html`), `/api/curionilabs/invite-request` emails **curionilabs@proton.me**. Porkbun static shows the same UI; use Jersey DNS (`216.158.237.213`) for full API + SPA hub.

---

## Not on this domain

Desk CRM app runs on broker VPS / wallstreet-sim — not on curionilabs.com.
