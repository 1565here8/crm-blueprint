# Connect: PC → GitHub → Live site (automatic)

## The chain

```text
Edit code on PC  →  double-click publish-live.bat  →  GitHub main  →  VPS rebuilds  →  CurioCRM.com
```

**Typical time:** ~2–3 minutes after publish (not instant, but fully automatic).

---

## One-time setup (do once)

### A. GitHub repo has deploy files

Upload to **1565here8/ethor770** (if not already):

- `.github/workflows/deploy.yml`
- `scripts/deploy-vps.sh`
- `scripts/vps-first-setup.sh`
- `ecosystem.config.cjs`
- `publish-live.bat`

Or upload fresh **`CurioCRM-github.zip`** from Desktop.

### B. Njalla VPS 30 running

Follow **DEPLOY-NJALLA-VPS.md** — SSH, clone repo, `.env`, nginx, certbot.

### C. GitHub Actions secrets

Repo → **Settings → Secrets → Actions**:

| Secret | Value |
|--------|--------|
| `VPS_HOST` | Njalla VPS IP |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | private key (Actions can SSH to VPS) |

### D. Git on your PC

Install: https://git-scm.com/download/win (if not installed)

---

## Every day — publish changes

1. Edit files in `C:\Users\torah\Desktop\wallstreet-sim`
2. **Double-click `publish-live.bat`**
3. Enter commit message (or press Enter)
4. Wait ~2–3 min
5. Open **https://CurioCRM.com**

Check progress: https://github.com/1565here8/ethor770/actions

---

## Status checklist

| Step | Done? |
|------|-------|
| VPS online + app running | |
| DNS CurioCRM.com → VPS IP | |
| GitHub secrets set | |
| `deploy.yml` on GitHub | |
| `publish-live.bat` works | |

Until **all** are done, push to GitHub updates the repo but **not** the live site.

---

## If publish-live.bat fails

- **Git not found** → install Git, restart PC
- **Push rejected** → sign in to GitHub when browser opens
- **Actions red X** → check secrets / VPS SSH
- **Site old after green Actions** → hard refresh browser (Ctrl+F5)
