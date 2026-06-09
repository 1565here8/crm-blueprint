/**
 * Elon-style CRM ship: one folder, one remote, push → GitHub Actions → VPS.
 *
 *   node scripts/elon-ship-crm.mjs
 *   node scripts/elon-ship-crm.mjs --push
 *   node scripts/elon-ship-crm.mjs --push --open
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const home = process.env.USERPROFILE ?? "";
const CRM =
  process.env.CRM_DIR?.trim() ||
  (existsSync(path.join(home, "Desktop", "wallstreet-sim", "src", "AdminRoutes.tsx"))
    ? path.join(home, "Desktop", "wallstreet-sim")
    : path.join(home, "Desktop", "cursoruniverse", "wallstreet-sim"));
const SKELETON = path.join(home, "Desktop", "cursoruniverse", "wallstreet-sim");
const NETWORK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** Copied from My_network_App into wallstreet-sim (CRM lives there only). */
const COPY_FROM_NETWORK = [
  "FIX-CRM-ADMIN.bat",
  "scripts/crm-fix-admin-live.mjs",
  "CRM-FIX-NOW.md",
];
const REMOTE = "https://github.com/1565here8/ethor770.git";
const ADMIN = "https://admin.etoropros.com/admin";
const ACTIONS = "https://github.com/1565here8/ethor770/actions";

const COPY_FILES = [
  "package.json",
  "tsconfig.json",
  "index.html",
  "postcss.config.js",
  "tailwind.config.js",
  "ecosystem.config.cjs",
  ".gitignore",
  ".env.example",
  "CONNECT-SERVER.bat",
  "ELON-FIX.txt",
  "pack-for-github.ps1",
  "GITHUB-UPLOAD.md",
  "DEPLOY-NJALLA-VPS.md",
  "SHOW-GITHUB-KEY.bat",
  ".github/workflows/deploy.yml",
];

const WRITE_IF_MISSING = {
  "vite.config.ts": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { target: "es2020", outDir: "dist", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://127.0.0.1:3002", changeOrigin: true } },
  },
});
`,
};

function resolveGit() {
  if (process.platform !== "win32") return "git";
  for (const g of ["git", path.join(process.env["ProgramFiles"] ?? "", "Git", "cmd", "git.exe")]) {
    try {
      execSync(`"${g}" --version`, { stdio: "pipe", windowsHide: true });
      return g.includes(" ") ? `"${g}"` : g;
    } catch {
      /* next */
    }
  }
  return null;
}

const GIT = resolveGit();

function git(cmd, cwd) {
  if (!GIT) throw new Error("Git not found");
  execSync(`${GIT} ${cmd}`, { cwd, stdio: "inherit", windowsHide: true });
}

function copyInfra() {
  console.log("\n[elon] CRM root:", CRM);
  if (!existsSync(path.join(CRM, "src", "AdminRoutes.tsx"))) {
    console.error("[elon] No CRM source — check Desktop\\wallstreet-sim");
    process.exit(1);
  }
  let copied = 0;
  for (const rel of COPY_FILES) {
    const from = path.join(SKELETON, rel);
    const to = path.join(CRM, rel);
    if (!existsSync(from)) continue;
    mkdirSync(path.dirname(to), { recursive: true });
    try {
      writeFileSync(to, readFileSync(from));
      copied++;
    } catch (e) {
      console.warn(`[elon] skip ${rel}:`, e.code ?? e.message);
    }
  }
  for (const [rel, body] of Object.entries(WRITE_IF_MISSING)) {
    const to = path.join(CRM, rel);
    if (!existsSync(to)) {
      writeFileSync(to, body, "utf8");
      copied++;
    }
  }
  for (const rel of COPY_FROM_NETWORK) {
    const from = path.join(NETWORK_ROOT, rel);
    const to = path.join(CRM, rel);
    if (!existsSync(from)) continue;
    mkdirSync(path.dirname(to), { recursive: true });
    writeFileSync(to, readFileSync(from));
    copied++;
  }
  console.log(`[elon] Synced ${copied} deploy/build files → wallstreet-sim only.\n`);
}

function ensureGit() {
  if (!existsSync(path.join(CRM, ".git"))) {
    git("init", CRM);
    git(`remote add origin ${REMOTE}`, CRM);
  }
  git("checkout -B main", CRM);
}

function pushMain() {
  ensureGit();
  git("add -A", CRM);
  try {
    git('commit -m "elon: ship CurioCRM + deploy pipe"', CRM);
  } catch {
    console.log("[elon] Nothing new to commit.");
  }
  console.log("[elon] Pushing main...\n");
  try {
    git("push -u origin main", CRM);
    console.log("[elon] Push OK:", ACTIONS);
  } catch {
    console.log("[elon] Push failed — run: git pull origin main --allow-unrelated-histories");
    console.log("  Then: git push -u origin main");
    console.log("  Deploy secrets: SHOW-GITHUB-KEY.bat in wallstreet-sim\n");
  }
}

function openUrls() {
  if (process.platform !== "win32") return;
  for (const u of [ACTIONS, ADMIN]) {
    execSync(`start "" "${u}"`, { stdio: "ignore", windowsHide: true });
  }
}

const push = process.argv.includes("--push");
const open = process.argv.includes("--open");
copyInfra();
if (push) pushMain();
if (open) openUrls();
