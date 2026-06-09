/**
 * CurioCRM — print / open parallel Cloud Agent prompts (wallstreet-sim).
 *
 *   node scripts/crm-cloud-agents.mjs
 *   node scripts/crm-cloud-agents.mjs --open 6
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const home = process.env.USERPROFILE ?? "";
const CRM_PATHS = [
  path.join(home, "Desktop", "wallstreet-sim"),
  path.join(home, "Desktop", "cursoruniverse", "wallstreet-sim"),
];
const DEFAULT_GITHUB = "https://github.com/1565here8/ethor770.git";

const WORKSTREAMS = [
  { id: 1, title: "System placeholders", task: "Replace SystemPlaceholderPage stubs (feeds, cascading, platform-admin). Wire routes + server + guides.", pr: "crm: system modules" },
  { id: 2, title: "Payment gateways", task: "Implement remaining payment-gateways tabs. Use PaymentGatewaysLayout + paymentGateways.ts.", pr: "crm: payment gateways" },
  { id: 3, title: "Marketing placeholders", task: "Replace MarketingPlaceholderPage pages with real UI + APIs.", pr: "crm: marketing modules" },
  { id: 4, title: "Cashier & funding", task: "Finish funding + cashier flows under server/ and src/pages/admin/cashier/.", pr: "crm: cashier funding" },
  { id: 5, title: "CRM users & desk", task: "Polish UsersPage, desk leads/tasks, PageBottomGuide on CRM pages.", pr: "crm: users desk" },
  { id: 6, title: "Guides & build", task: "Missing guides, cloud build green, crmPageTutorials updates.", pr: "crm: guides build" },
];

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

function findCrmDir() {
  for (const p of CRM_PATHS) {
    if (existsSync(path.join(p, "src", "AdminRoutes.tsx"))) return p;
  }
  return CRM_PATHS[0];
}

function gitRemote(dir) {
  if (!GIT || !existsSync(path.join(dir, ".git"))) return DEFAULT_GITHUB;
  try {
    return (
      execSync(`${GIT} remote get-url origin`, { cwd: dir, encoding: "utf8", windowsHide: true }).trim() ||
      DEFAULT_GITHUB
    );
  } catch {
    return DEFAULT_GITHUB;
  }
}

function gitBranch(dir) {
  if (!GIT || !existsSync(path.join(dir, ".git"))) return "main";
  try {
    return execSync(`${GIT} branch --show-current`, { cwd: dir, encoding: "utf8", windowsHide: true }).trim() || "main";
  } catch {
    return "main";
  }
}

function buildPrompt(crmDir, repo, branch, ws) {
  const repoLine = repo.includes("github.com")
    ? `GitHub: ${repo}, branch: ${branch}.`
    : `Folder: ${crmDir} — push to GitHub first.`;
  return [
    `CurioCRM slot ${ws.id}/6: ${ws.title}`,
    repoLine,
    `Task: ${ws.task}`,
    "Rules: wallstreet-sim only; never My_network_App/public/etoropros. Cloud build + one PR.",
    `PR: ${ws.pr}`,
  ].join("\n");
}

let slots = 6;
let open = 0;
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === "--slots" && process.argv[i + 1]) slots = Math.min(6, Math.max(1, parseInt(process.argv[++i], 10) || 6));
  if (process.argv[i] === "--open" && process.argv[i + 1]) open = Math.min(6, Math.max(1, parseInt(process.argv[++i], 10) || 6));
  else if (process.argv[i] === "--open") open = slots;
}

const crmDir = findCrmDir();
const repo = gitRemote(crmDir);
const branch = gitBranch(crmDir);
const url = "https://cursor.com/agents";

console.log(`\nCurioCRM — ${slots} Cloud Agent slot(s)\n  ${crmDir}\n  ${url}\n`);
for (const ws of WORKSTREAMS.slice(0, slots)) {
  console.log(`--- AGENT ${ws.id}: ${ws.title} ---\n${buildPrompt(crmDir, repo, branch, ws)}\n`);
}
if (open > 0 && process.platform === "win32") {
  for (let i = 0; i < open; i++) execSync(`start "" "${url}"`, { stdio: "ignore", windowsHide: true });
  console.log(`Opened ${open} tab(s). Paste one prompt per tab.\n`);
}
