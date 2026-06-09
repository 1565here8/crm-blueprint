# CurioCRM — fix admin not loading (wallstreet-sim only)

**CurioCRM lives only in `wallstreet-sim`.** Not in My_network_App, not DagulAI, not AllmagusAI.

## What is broken

**On the internet:** `https://admin.etoropros.com/admin` redirects to `crm.xtoropro.com` — that domain does not exist, so the browser shows “can’t be reached”.

**On the server:** the `wallstreet-sim` app has a typo (`xtoropro` instead of `etoropros`) in config on VPS `80.78.30.85`.

---

## One click fix (your CRM folder)

**On your PC:** open folder

`C:\Users\torah\Desktop\wallstreet-sim`

**On your PC:** double-click

`C:\Users\torah\Desktop\wallstreet-sim\FIX-CRM-ADMIN.bat`

Needs:

- **On your PC:** `C:\Users\torah\.ssh\njalla_etoropros` (SSH key)
- Node.js + OpenSSH Client (Windows optional features)

Then open **on the internet:** `https://admin.etoropros.com/admin`

---

## If FIX-CRM-ADMIN.bat is missing

**In Cursor app:** open folder `C:\Users\torah\Desktop\wallstreet-sim`

**In Cursor terminal:** run

```bat
git pull
```

If still missing, copy `FIX-CRM-ADMIN.bat` and `scripts\crm-fix-admin-live.mjs` from My_network_App after `npm run elon:ship` in My_network_App (syncs fix files into wallstreet-sim).

---

## Manual SSH (same fix)

```bash
ssh -i C:\Users\torah\.ssh\njalla_etoropros root@80.78.30.85
sed -i.bak 's/crm.xtoropro.com/admin.etoropros.com/g; s/xtoropro/etoropros/g' /root/wallstreet-sim/.env
pm2 restart wallstreet-sim
```

---

## Wrong places (do not use for CRM login)

| Place | Why |
|-------|-----|
| **On your PC:** `My_network_App` | DagulAI / other products — not CurioCRM |
| **On the internet:** `etoropros.com/etoropros/admin` | Public broker demo, not staff CRM |
| **On the internet:** `crm.etoropros.com` | DNS never set up |

**Right CRM code folder:** `C:\Users\torah\Desktop\wallstreet-sim`  
**Right live URL:** `https://admin.etoropros.com/admin`
