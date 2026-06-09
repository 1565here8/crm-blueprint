# CurioniLabs invitation gate

Standalone gate for [curionilabs.com](https://curionilabs.com) — heraldic backdrop, invitation code / request (API on Jersey Node host; static FTP is gate UI only).

## Develop

```bash
cd curionilabs
npm install
npm run dev
```

- Web: http://localhost:5174
- API: http://localhost:3010

## Production (HTTPS, no VPS)

**Hosting:** Porkbun Static Hosting is already on **curionilabs.com** — upload `dist/` (see **PORKBUN-CURIONILABS.md**).

**Never on the CRM VPS.** Do not `pm2 start` curionilabs next to etoropros. If it appears: `bash scripts/retire-curionilabs-pm2.sh`

```bash
npm run build
```

Windows: **`DEPLOY-CURIONILABS-HTTPS.bat`** — builds + FTP upload if `.env.porkbun` has creds from Porkbun dashboard.

### Optional: Node on a server

```bash
npm run build
CURIONILABS_PORT=3010 npm start
```

Enquiries are stored in `data/enquiries.db` when using the local API (dev only uses this path in `import.meta.env.DEV`).

## Enquiry API

`POST /api/enquiry`

```json
{
  "name": "Jane Smith",
  "email": "jane@broker.com",
  "phone": "+1…",
  "company": "Acme FX Ltd",
  "market": "fx|crypto|both|other",
  "message": "optional"
}
```
