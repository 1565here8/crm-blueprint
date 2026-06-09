/** Public www gate while rebranding — admin host stays up. */

export const PUBLIC_REBRAND_TITLE = "Rebranding in progress";

export const PUBLIC_REBRAND_HEADLINE = "Curioni Labs is getting a fresh look";

export function publicRebrandParagraphs(): string[] {
  return [
    "Our public site is temporarily offline while we finish a full rebrand — new identity, copy, and compliance review.",
    "We are not affiliated with eToro Ltd. or any third-party broker brand.",
    "Staff can still use the operator CRM on the admin portal.",
  ];
}

export function publicRebrandMessage(): string {
  return `${PUBLIC_REBRAND_TITLE}. ${publicRebrandParagraphs()[0]}`;
}

export function publicRebrandHtml(): string {
  const body = publicRebrandParagraphs()
    .map((p) => `<p class="p">${escapeHtml(p)}</p>`)
    .join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${escapeHtml(PUBLIC_REBRAND_TITLE)} — Curioni Labs</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; font-family: system-ui, sans-serif; background: #0c1017; color: #e2e8f0; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .card { max-width: 32rem; text-align: center; }
    h1 { color: #14b8a6; font-size: 1.75rem; margin: 0 0 0.5rem; }
    h2 { font-size: 1.1rem; font-weight: 600; color: #f8fafc; margin: 0 0 1.25rem; }
    .p { font-size: 0.95rem; line-height: 1.6; color: #94a3b8; margin: 0 0 1rem; }
    .badge { display: inline-block; margin-top: 1.5rem; padding: 0.35rem 0.75rem; border-radius: 999px; background: #14b8a61a; color: #5eead4; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Public site offline</div>
    <h1>Curioni Labs</h1>
    <h2>${escapeHtml(PUBLIC_REBRAND_HEADLINE)}</h2>
    ${body}
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
