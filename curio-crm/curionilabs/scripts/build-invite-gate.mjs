/**
 * Single source of truth: My_network_App/public/curionilabs.html
 * → wallstreet-sim/curionilabs/index.html + dist/index.html (Porkbun upload)
 */
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "..", "..", "My_network_App", "public", "curionilabs.html");
const localCopy = join(root, "index.html");
const outDir = join(root, "dist");
const dest = join(outDir, "index.html");

if (!existsSync(source)) {
  console.error("[curionilabs] Missing source:", source);
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
copyFileSync(source, localCopy);
copyFileSync(source, dest);
console.log("[curionilabs] Synced from My_network_App/public/curionilabs.html");
console.log("[curionilabs] dist/index.html ready (no legacy Vite assets)");
