# CRM fix — do this order

**Live:** https://admin.etoropros.com/admin  
**Repo:** this folder → https://github.com/1565here8/ethor770

## 1. Ship code (after `git pull`)

```bat
cd C:\Users\torah\Desktop\wallstreet-sim
git pull origin main
```

Or double-click **SHIP-ELON.bat** from this folder.

## 2. Deploy must be green

https://github.com/1565here8/ethor770/actions

**All red X on “Deploy to VPS”** = the live site never updated. Open the latest run:

| Failed step | Meaning |
|-------------|---------|
| **Require VPS secrets** | GitHub Secrets missing — fix below |
| **Deploy over SSH** | Wrong key, firewall, or VPS down — `CONNECT-SERVER.bat` |
| **Build** | Code error — fix in repo, push again |
| **Build** green + **Deploy** red | SSH/secrets only |

Secrets (one-time): ethor770 → **Settings → Secrets and variables → Actions**:

- `VPS_HOST` = `80.78.30.85`
- `VPS_USER` = `root`
- `VPS_SSH_KEY` = full private key from `SHOW-GITHUB-KEY.bat`

Then **Re-run all jobs** on the latest workflow run.

## 3. Site down or blank after deploy?

SSH in (`CONNECT-SERVER.bat`), then:

```bash
cd /var/www/etoropros
bash scripts/vps-recover-now.sh
```

If that fails, full deploy:

```bash
bash scripts/deploy-vps.sh
```

## 4. Verify on admin

- Hard refresh: **Ctrl+Shift+R**
- Old `/admin/funding` → should land on **Pending In**
- Marketing placeholder pages → links to Campaigns / Allies / Tracking

## 5. Wrong folder?

Do **not** edit `My_network_App/public/etoropros` for this CRM. Only this repo.
