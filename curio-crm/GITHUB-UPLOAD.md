# Upload to GitHub (no Git required)

Use the zip created by `pack-for-github.ps1`, or follow the steps below.

## 1. Create the zip (Windows)

Right-click **pack-for-github.ps1** → **Run with PowerShell**, or in PowerShell:

```powershell
cd C:\Users\torah\Desktop\wallstreet-sim
powershell -ExecutionPolicy Bypass -File .\pack-for-github.ps1
```

Output: **`C:\Users\torah\Desktop\CurioCRM-github.zip`**

That zip excludes `node_modules`, `.env`, `data/`, and `dist/` (Render builds those).

## 2. Create a private GitHub repo

1. Sign in with a **separate email** (Proton, Tutanota, etc.) if you want privacy.
2. Go to [github.com/new](https://github.com/new)
3. Name: e.g. `CurioCRM` (anything you like)
4. Visibility: **Private**
5. Do **not** add README, .gitignore, or license (you already have them)

## 3. Upload the zip contents

**Option A — unzip then upload folders**

1. Unzip `CurioCRM-github.zip` to a folder.
2. On the empty repo page, click **Add file → Upload files**.
3. Drag **all files and folders** from the unzipped folder (not the folder itself).
4. Commit message: `Initial upload`
5. Click **Commit changes**

**Option B — GitHub web “import”**

1. Unzip locally first.
2. Use [github.com/new/import](https://github.com/new/import) only if you host the zip on a URL (usually Option A is easier).

## 4. Deploy on Render

1. [render.com](https://render.com) → sign up (same separate email is fine).
2. **New → Blueprint**
3. Connect GitHub → select your private repo.
4. Render reads `render.yaml` automatically.
5. When prompted, set:
   - `ADMIN_USERNAME` — your CRM login name
   - `ADMIN_PASSWORD` — strong password (saved only in Render, not in GitHub)
6. **Apply** → wait for build (~5–10 min).

Live URL: `https://CurioCRM.onrender.com` (or similar).

- Landing: `/`
- Login: `/login`
- CRM: `/admin` (after login as admin)

## 5. Never upload these

| Item | Why |
|------|-----|
| `.env` | Secrets |
| `data/` | Local SQLite database |
| `node_modules/` | Huge; rebuilt on Render |

## Troubleshooting

- **Build fails on typecheck** — run `npm run build` locally first; fix errors, re-zip, re-upload.
- **Admin login fails** — set `ADMIN_USERNAME` / `ADMIN_PASSWORD` in Render **before** first successful deploy, or delete the disk and redeploy so bootstrap runs again.
- **Data lost after deploy** — confirm the disk in `render.yaml` is attached (Starter plan).
