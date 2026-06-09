# ⚠ Not the live admin CRM

**Your CRM is `wallstreet-sim`** (CurioCRM at `https://admin.etoropros.com/admin`).

## Live site broken? (admin redirects / DNS)

**Cause:** `wallstreet-sim` on VPS `80.78.30.85` redirects `/admin` to `https://crm.xtoropro.com/admin` — typo domain, no DNS.

**Fix without a terminal on your PC:** see **[CRM-FIX-WITHOUT-TERMINAL.md](./CRM-FIX-WITHOUT-TERMINAL.md)** (GitHub Actions + paste SSH secret).

**One click (Windows):** in **`wallstreet-sim` only**, double-click **`FIX-CRM-ADMIN.bat`** — see **`CRM-FIX-NOW.md`** in that folder. (Run `npm run elon:ship` from My_network_App once if the bat is missing.)

**Or from terminal:**

```bat
npm run crm:fix-admin
```

Or SSH manually:

```bash
ssh -i ~/.ssh/njalla_etoropros root@80.78.30.85
sed -i.bak 's/crm.xtoropro.com/admin.etoropros.com/g; s/xtoropro/etoropros/g' /root/wallstreet-sim/.env
pm2 restart wallstreet-sim
```

Then open: **https://admin.etoropros.com/admin**

Do **not** use `crm.etoropros.com` unless you add DNS for it. `etoropros.com/etoropros/admin` is the broker SPA, not the staff CRM login.

Do **not** use this folder for CRM work. All guides, System pages, Balance events, releases, etc. belong in:

```
C:\Users\torah\Desktop\wallstreet-sim
```

See **`wallstreet-sim/THE-CRM.md`**.

## Ship & parallel agents (from this repo)

```bat
npm run elon:ship
npm run crm:agents
```

- **elon:ship** — sync deploy skeleton, push `wallstreet-sim` → [ethor770](https://github.com/1565here8/ethor770)
- **crm:agents** — six Cloud Agent prompts for parallel CRM work

---

`public/etoropros/` here is a legacy PHP drop-in kit only. It does **not** power admin.etoropros.com.
