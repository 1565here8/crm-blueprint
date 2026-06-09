# wallstreet-sim — Paper Trading + Broker CRM

**This is the US stocks / crypto simulator with the admin backoffice (CRM).**  
Not the compute platform — that is `My_network_App` on your Desktop.

---

## Open this folder

```
C:\Users\torah\Desktop\wallstreet-sim
```

In Cursor: **File → Open Folder** → paste the path above.

---

## Run it

```powershell
cd C:\Users\torah\Desktop\wallstreet-sim
copy .env.example .env    # first time only — set ADMIN_USERNAME / ADMIN_PASSWORD
npm install               # first time only
npm run dev
```

If you get **connection refused** or API crash:

```powershell
npm rebuild better-sqlite3
npm run dev
```

Use the URL Vite prints (often **5180** or **5181** if ports are busy).

---

## Browser links (after `npm run dev`)

| What | URL |
|------|-----|
| **User trading terminal** | http://localhost:5180 |
| **Admin CRM backoffice** | http://localhost:5180/admin |
| **CRM Users list** | http://localhost:5180/admin/crm/users |
| **Online visitors** | http://localhost:5180/admin/online |
| **API health** | http://localhost:3002/api/health |

**Ports:** UI **5180** (or next free port) · API **3002**

---

## Admin login

Set in `.env` before first run (empty database):

```env
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-strong-password-here
```

Reset existing admin:

```powershell
npx tsx scripts/set-admin.ts YourAdmin YourStrongPassword
```

---

## Key code locations

| Area | Path |
|------|------|
| Admin sidebar | `src/components/admin/AdminLayout.tsx` |
| CRM users list | `src/pages/admin/crm/UsersPage.tsx` |
| User profile + action bubble | `src/pages/admin/crm/UserProfilePage.tsx` |
| CRM backend | `server/crmUsers.ts` |
| Database / trades | `server/db.ts` |

---

## Other projects on your Desktop

| Folder | Purpose |
|--------|---------|
| **`My_network_App`** | Compute platform (Cloud / Local / Mesh) |
| **`wallstreet-sim`** ← you are here | Paper trading + broker CRM backoffice |
| **`openalgo`** | Old India-broker experiment — not in active use |

See also: `C:\Users\torah\Desktop\My_network_App\START-HERE.md`
