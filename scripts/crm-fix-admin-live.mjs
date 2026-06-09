#!/usr/bin/env node
/**
 * Fix live CurioCRM redirect: admin.etoropros.com → broken crm.xtoropro.com (no DNS).
 *
 * Requires .env:
 *   ETOROPROS_DEPLOY_HOST=80.78.30.85
 *   ETOROPROS_DEPLOY_USER=root
 *   ETOROPROS_SSH_KEY=C:\Users\torah\.ssh\njalla_etoropros
 *
 *   node scripts/crm-fix-admin-live.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };
const host = env.ETOROPROS_DEPLOY_HOST?.trim() || "80.78.30.85";
const user = env.ETOROPROS_DEPLOY_USER?.trim() || "root";
const sshKey =
  env.ETOROPROS_SSH_KEY?.trim() ||
  path.join(process.env.HOME || process.env.USERPROFILE || "", ".ssh", "njalla_etoropros");
const remote = `${user}@${host}`;

const SSH_OPTS = ["-o", "ConnectTimeout=20", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new"];
const sshBase = [...(existsSync(sshKey) ? ["-i", sshKey] : []), ...SSH_OPTS];

function ssh(cmd) {
  const args = [...sshBase, remote, cmd];
  const r = spawnSync("ssh", args, { encoding: "utf8" });
  return { status: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

const FIX_SCRIPT = `
set -e
echo "[crm-fix] Searching for xtoropro typo..."
HITS=$(grep -rl 'xtoropro' /root /opt /var/www /home 2>/dev/null | head -40 || true)
if [ -z "$HITS" ]; then
  echo "[crm-fix] No xtoropro in files — checking pm2 env..."
  pm2 jlist 2>/dev/null | grep -i xtoropro || true
fi
for f in $HITS; do
  echo "[crm-fix] Patching $f"
  sed -i.bak-crmfix 's/crm\\.xtoropro\\.com/admin.etoropros.com/g; s/xtoropro/etoropros/g' "$f" || true
done
# Common wallstreet-sim locations
for d in /root/wallstreet-sim /opt/wallstreet-sim /var/www/wallstreet-sim; do
  [ -f "$d/.env" ] && sed -i.bak-crmfix 's/crm\\.xtoropro\\.com/admin.etoropros.com/g; s/xtoropro/etoropros/g' "$d/.env" && echo "[crm-fix] Patched $d/.env"
done
echo "[crm-fix] Restarting wallstreet-sim (pm2)..."
pm2 restart etoropros 2>/dev/null || pm2 restart wallstreet-sim 2>/dev/null || pm2 restart all 2>/dev/null || true
sleep 2
curl -sS -k -I https://admin.etoropros.com/admin 2>/dev/null | grep -i '^location:' || echo "[crm-fix] No Location header (good if 200)"
echo "[crm-fix] Health:" 
curl -sS -k https://admin.etoropros.com/api/health 2>/dev/null || true
echo ""
echo "[crm-fix] Done."
`.trim();

console.log(`[crm-fix] Connecting to ${remote}...`);
if (!existsSync(sshKey)) {
  console.error("\n[crm-fix] STOP — SSH key not found:", sshKey);
  console.error("  Set ETOROPROS_SSH_KEY in .env (see ETOROPROS-ONLY-THIS-FOLDER.txt)\n");
  process.exit(1);
}

const { status, stdout, stderr } = ssh(FIX_SCRIPT);
process.stdout.write(stdout);
if (stderr) process.stderr.write(stderr);
if (status !== 0) {
  console.error("\n[crm-fix] SSH failed. Run from your PC with Njalla key, or fix .env on VPS manually:");
  console.error("  sed -i 's/crm.xtoropro.com/admin.etoropros.com/g' /root/wallstreet-sim/.env");
  console.error("  pm2 restart etoropros\n");
  process.exit(status);
}

const verify = spawnSync(
  "curl",
  ["-sS", "-k", "-I", "--connect-timeout", "12", "https://admin.etoropros.com/admin"],
  { encoding: "utf8" },
);
const loc = (verify.stdout || "").match(/^location:\s*(.+)$/im)?.[1]?.trim();
if (loc && /xtoropro/i.test(loc)) {
  console.error("\n[crm-fix] Still redirecting to:", loc);
  console.error("  Open VPS and fix .env manually, then: pm2 restart etoropros\n");
  process.exit(2);
}
console.log("\n[crm-fix] OK — open https://admin.etoropros.com/admin");
