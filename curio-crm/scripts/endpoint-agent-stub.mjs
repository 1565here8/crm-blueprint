#!/usr/bin/env node
/**
 * CurioCRM Endpoint Agent — roadmap stub (Windows service would call this pattern).
 * POST USB / physical events to the CRM. Browsers cannot detect USB.
 *
 * Usage (from repo root, with server running):
 *   set ENDPOINT_AGENT_KEY=your-shared-secret
 *   set CRM_URL=https://admin.yourcrm.com
 *   node scripts/endpoint-agent-stub.mjs usb_plugged agent34 "SanDisk Ultra"
 */
const base = (process.env.CRM_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const key = process.env.ENDPOINT_AGENT_KEY || "";
const eventType = process.argv[2] || "usb_plugged";
const agentId = process.argv[3] || "agent-stub";
const deviceLabel = process.argv[4] || "Unknown device";
const workstationId = process.env.COMPUTERNAME || process.env.HOSTNAME || "desk-pc";

if (!key) {
  console.error("Set ENDPOINT_AGENT_KEY to match the server env.");
  process.exit(1);
}

const res = await fetch(`${base}/api/admin/security/endpoint-event`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Endpoint-Agent-Key": key,
  },
  body: JSON.stringify({
    agentId,
    eventType,
    deviceLabel,
    workstationId,
    meta: { source: "endpoint-agent-stub", at: new Date().toISOString() },
  }),
});

const text = await res.text();
console.log(res.status, text);
process.exit(res.ok ? 0 : 1);
