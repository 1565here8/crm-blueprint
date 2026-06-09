/**
 * Export transparent PNGs from public/brand/curionilabs/*.svg
 * Run on Cloud Agent: npx --yes @resvg/resvg-js-cli@2.6.2 scripts/export-curionilabs-logos.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brand = join(root, "public", "brand", "curionilabs");
const pngDir = join(brand, "png");
mkdirSync(pngDir, { recursive: true });

const jobs = [
  { in: "mark.svg", out: "mark-512.png", w: 512, h: 512 },
  { in: "mark.svg", out: "mark-256.png", w: 256, h: 256 },
  { in: "mark.svg", out: "mark-128.png", w: 128, h: 128 },
  { in: "mark.svg", out: "mark-64.png", w: 64, h: 64 },
  { in: "favicon.svg", out: "favicon-32.png", w: 32, h: 32 },
  { in: "mark.svg", out: "apple-touch-icon.png", w: 180, h: 180 },
  { in: "logo-full-dark.svg", out: "logo-full-dark-640w.png", w: 640, h: 120 },
  { in: "logo-full-dark.svg", out: "logo-full-dark-1200w.png", w: 1200, h: 225 },
  { in: "logo-full-light.svg", out: "logo-full-light-640w.png", w: 640, h: 120 },
  { in: "wordmark.svg", out: "wordmark-640w.png", w: 640, h: 80 },
];

for (const { in: input, out, w, h } of jobs) {
  const src = join(brand, input);
  const dest = join(pngDir, out);
  execFileSync("npx", ["--yes", "resvg-js", src, dest, "-w", String(w), "-h", String(h)], {
    stdio: "inherit",
    cwd: root,
  });
  console.log(`wrote ${out}`);
}

console.log(`Done — PNGs in public/brand/curionilabs/png/`);
