#!/usr/bin/env node
/**
 * Publish a CRM release (auto PDF + HTML).
 * Usage:
 *   node scripts/crm-publish-release.mjs --title "..." --changed "..." --who "..." --do "..."
 * Env: CRM_RELEASE_SECRET, API_BASE (default http://127.0.0.1:3001)
 */
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    title: { type: "string" },
    changed: { type: "string" },
    who: { type: "string" },
    do: { type: "string" },
    kid: { type: "string" },
    category: { type: "string", default: "platform" },
    slug: { type: "string" },
  },
});

const secret = process.env.CRM_RELEASE_SECRET?.trim();
if (!secret) {
  console.error("Set CRM_RELEASE_SECRET in .env");
  process.exit(1);
}

const base = (process.env.API_BASE || "http://127.0.0.1:3001").replace(/\/$/, "");
const body = {
  title: values.title,
  whatChanged: values.changed,
  whoAffected: values.who,
  whatToDo: values.do,
  kidSummary: values.kid,
  category: values.category,
  slug: values.slug,
};

for (const [k, v] of Object.entries({ title: body.title, changed: body.whatChanged, who: body.whoAffected, do: body.whatToDo })) {
  if (!v) {
    console.error(`Missing --${k}`);
    process.exit(1);
  }
}

const res = await fetch(`${base}/api/crm/releases`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-crm-release-secret": secret,
  },
  body: JSON.stringify(body),
});

const json = await res.json();
if (!res.ok) {
  console.error(json.error || res.statusText);
  process.exit(1);
}

console.log(`Release #${json.id} published`);
console.log(`PDF: ${base}${json.pdfUrl}`);
console.log(`HTML: ${base}${json.htmlUrl}`);
