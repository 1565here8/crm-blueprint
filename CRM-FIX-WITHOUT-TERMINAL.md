# Fix CRM admin loading (no terminal on your PC)

**Live problem:** `admin.etoropros.com` sends you to `crm.xtoropro.com`, but **xtoropro.com is not registered**, so the browser shows DNS / “can’t be reached”.

The Cloud Agent **cannot** SSH to your VPS without a key. Fixing the live site needs **one** of these (browser only):

## Option A — double-click (Windows, fastest)

In `My_network_App` folder, run **`FIX-CRM-ADMIN.bat`**.

Needs: Node.js, OpenSSH Client, key at `%USERPROFILE%\.ssh\njalla_etoropros` (see `ETOROPROS-ONLY-THIS-FOLDER.txt`).

---

## Option B — GitHub secret (~1 minute, no SSH on PC)

1. Open: https://github.com/1565here8/vpnxmen/settings/secrets/actions
2. **New repository secret**
   - Name: `ETOROPROS_SSH_KEY`
   - Value: paste the full contents of `C:\Users\torah\.ssh\njalla_etoropros` (private key file)
3. Add two more secrets (if missing):
   - `ETOROPROS_DEPLOY_HOST` = `80.78.30.85`
   - `ETOROPROS_DEPLOY_USER` = `root`
4. Open: https://github.com/1565here8/vpnxmen/actions/workflows/crm-fix-admin-live.yml
5. Click **Run workflow** → **Run workflow**

When it goes green, open: **https://admin.etoropros.com/admin**

Then tell the Cloud Agent: **“CRM fix workflow ran”** — it can verify and help with AI of Wall Street next.

## Option C — Njalla panel (if you prefer DNS + keep Xtoropro name)

Register **xtoropro.com** at Njalla, add **A** record `crm` → `80.78.30.85`.  
That only makes the redirect target resolve; staff CRM should still use **etoropros** branding long term (fix `.env` on VPS when you can).

## What the agent already prepared in git

- `npm run crm:fix-admin` (needs SSH key in local `.env`)
- PR: https://github.com/1565here8/vpnxmen/pull/7
