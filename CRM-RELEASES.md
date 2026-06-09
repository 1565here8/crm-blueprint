# CRM auto release notes (PDF + HTML)

Better than the old **Release Pdf** list: human title + **3 plain answers** on screen, plus auto-generated PDF.

## Staff UI

`https://YOUR-HOST/crm-admin/release-notes.html`

- Publish form → creates NOTE ID, `/crm-releases/{id}.html`, `/crm-releases/{id}.pdf`
- List shows **What changed / Who / What to do** without opening the PDF

## API

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/crm/releases` | Public |
| GET | `/api/crm/releases/:id` | Public |
| POST | `/api/crm/releases` | Admin session **or** header `x-crm-release-secret` |

Body:

```json
{
  "title": "Safer close-trade button",
  "whatChanged": "Closing a trade now requires confirmation…",
  "whoAffected": "Traders and support",
  "whatToDo": "Tell users to use the new confirm popup",
  "kidSummary": "Optional one-liner for training",
  "category": "trading"
}
```

## After every deploy (CI / VPS)

1. Add to `.env`: `CRM_RELEASE_SECRET=long-random-string`
2. Run:

```bash
npm run crm:release -- \
  --title "Your headline" \
  --changed "What changed in plain English" \
  --who "Who is affected" \
  --do "What staff should do"
```

Uses `API_BASE` (default `http://127.0.0.1:3001`).

## Live PHP CRM (toropros)

Upload `public/crm-admin/` + `public/crm-releases/` and point **Release Pdf** menu to `/crm-admin/release-notes.html`, or iframe it.

Data store: `data/crm-releases/index.json` (IDs). PDFs live in `public/crm-releases/`.

## First boot

Server seeds two sample releases if the store is empty (withdrawal limits, close-trade).
