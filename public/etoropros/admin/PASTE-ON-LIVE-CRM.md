# ETOROPROS live CRM ? one paste only

## STEP 1 ? Upload

`public/etoropros` ? server `public_html/etoropros`

Make `public_html/etoropros/releases/` writable (755 or 775).

## STEP 2 ? Paste once in the main admin layout (before `</body>`)

```html
<script src="/etoropros/admin/embed-etoropros.js"></script>
```

That is all. The script auto-detects which page you are on (Error Logs, SMTP, Balance, etc.) and loads:

- Bottom **plain-language guide**
- Blue **?** help drawer
- **AI ask box** (needs GROQ_API_KEY or GEMINI_API_KEY on your Node app)
- Inline **?** on hotfix buttons (Error Logs)

Optional override if auto-detect misses a page:

```html
<meta name="crm-page" content="super-admin-smtp-logs" />
```

## Open

`https://etoropros.com/etoropros/admin/`

Hub pages (full UI): Release Pdf, SMTP Logs, Balance events, Order Storage, Error Logs, Encyclopedia.
