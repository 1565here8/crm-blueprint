# CurioCRM — "everything dead" checklist

**The VPS is not down.** From the internet right now:

- `https://etoropros.com/api/health` → `{"ok":true}`
- `https://admin.etoropros.com/admin` → redirects to `crm.xtoropro.com` (no public DNS → looks dead)

## 30-second test on your PC

Double-click **`TEST-CRM-ALIVE.bat`**. If you do **not** see `ok:true`, your PC/network cannot reach the server (not a CRM bug).

## Fix redirect (double-click)

**`FIX-CRM-HOSTS.bat`** → adds `80.78.30.85 crm.xtoropro.com` to hosts → opens `https://crm.xtoropro.com/admin`

Common mistakes: saved `hosts.txt` in Desktop (wrong); typo **xtorpro** vs **xtoropro**; did not run Notepad as Administrator.

## Permanent fix (Njalla website only)

Register **xtoropro.com** at Njalla (same place as etoropros). Add **A** records:

| Name | Value |
|------|--------|
| `@` | `80.78.30.85` |
| `crm` | `80.78.30.85` |
| `www` | `80.78.30.85` |

SSL on the server already includes `crm.xtoropro.com`. No SSH required for this path.

---

# CurioCRM works now (no PowerShell, no SSH)

The server is **up**. Only **`admin.etoropros.com`** sends you to a typo domain with no DNS.

## Fastest — open this URL

**https://etoropros.com/admin**

Same app, HTTP 200, no redirect. Double-click **`OPEN-CRM-NOW.bat`** in this folder.

---

## If you must use `admin.etoropros.com` (hosts trick, no server)

1. Open **Notepad as Administrator** (right-click Notepad → Run as administrator).
2. File → Open → `C:\Windows\System32\drivers\etc\hosts`
3. Add one line at the bottom:

```
80.78.30.85 crm.xtoropro.com
```

4. Save. Open **https://admin.etoropros.com/admin** again.

The redirect will land on your VPS instead of “DNS not found”. Remove this line after the real server fix.

---

## Fix the server (no terminal on PC)

GitHub → **Settings → Secrets → Actions** → add `ETOROPROS_SSH_KEY` (paste private key file), `ETOROPROS_DEPLOY_HOST` = `80.78.30.85`, `ETOROPROS_DEPLOY_USER` = `root`.

Then: **Actions → Fix CRM admin redirect (live) → Run workflow**.

---

## Njalla browser console (paste once)

Log in at Njalla → your VPS → **Console** (in-browser shell), paste:

```bash
grep -rl xtoropro /root /opt /var/www /home /root/.pm2 2>/dev/null | while read f; do sed -i.bak 's/crm.xtoropro.com/admin.etoropros.com/g;s/xtoropro/etoropros/g' "$f"; echo FIXED:$f; done; pm2 restart etoropros
```

---

## Permanent branding fix

When SSH works: run **`FIX-CRM-ADMIN.bat`** or the GitHub workflow above so `admin.etoropros.com` stops redirecting.
