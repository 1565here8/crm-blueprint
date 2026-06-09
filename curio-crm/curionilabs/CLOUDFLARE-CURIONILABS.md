# curionilabs.com — Cloudflare + GitHub Pages

**Correct repo:** https://github.com/1565here8/curionilabs-landing  
**Local folder:** `C:\Users\torah\Desktop\curionilabs-landing`

| Layer | Role |
|--------|------|
| Cloudflare | DNS + HTTPS proxy (orange cloud) |
| GitHub Pages | Serves `dist/index.html` (invite gate) |
| Jersey VPS | Optional: `/api/curionilabs/*` + `/curionilabs` hub (`My_network_App`) |

Porkbun static/FTP docs in `PORKBUN-CURIONILABS.md` are **out of date** if DNS is on Cloudflare.

## Deploy invite page

```powershell
cd C:\Users\torah\Desktop\curionilabs-landing
npm run build
git add -A
git commit -m "Invite gate"
git push origin main
```

Then Cloudflare → **Caching → Purge Everything**.

## You should see

https://curionilabs.com — **Curioni Labs · By invitation** (not Desk CRM marketing).
