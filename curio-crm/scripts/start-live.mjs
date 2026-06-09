import { config } from "dotenv";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
config({ path: path.join(root, ".env") });

process.env.PORT = process.env.PORT ?? "3002";
process.env.NODE_ENV = process.env.NODE_ENV ?? "production";

const secret = process.env.SESSION_SECRET ?? "";
if (secret.length < 16) {
  console.error("");
  console.error("  ERROR: SESSION_SECRET missing or too short in .env");
  console.error("  Fix: open .env and set SESSION_SECRET to a random string (32+ chars)");
  console.error("");
  process.exit(1);
}

console.log(`[start-live] PORT=${process.env.PORT}`);

const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["tsx", "server/index.ts"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 1));
