# CurioniLabs logo package

All assets use **transparent backgrounds** (SVG). Export PNG/WebP at any size without quality loss.

## Files

| File | Use |
|------|-----|
| `mark.svg` | App icon, avatar, favicon source (512×512 viewBox) |
| `wordmark.svg` | Text only on dark UI (white) |
| `logo-full-dark.svg` | Mark + CURIONILABS + COMMAND on **dark** sidebar/header |
| `logo-full-light.svg` | Same layout for **light** backgrounds (print, docs) |
| `favicon.svg` | Browser tab (32×32 viewBox) |

## PNG folder (`png/`)

Run once on Cloud Agent (or any machine with Node):

```bash
node scripts/export-curionilabs-logos.mjs
```

Outputs transparent PNGs: `mark-512.png`, `mark-256.png`, `mark-128.png`, `mark-64.png`, `favicon-32.png`, `apple-touch-icon.png`, full logos at 640w and 1200w, and `wordmark-640w.png`.

## Recommended PNG exports (manual)

Open any SVG in Figma, Inkscape, or [cloudconvert.com](https://cloudconvert.com/svg-to-png) and export:

| Size | Filename suggestion |
|------|---------------------|
| 512 | `mark-512.png` |
| 256 | `mark-256.png` |
| 128 | `mark-128.png` |
| 64 | `mark-64.png` |
| 32 | `favicon-32.png` |
| 180 | `apple-touch-icon.png` |
| 1200×225 | `logo-full-dark-1200w.png` |

Enable **transparent background** when exporting PNG.

## In-app usage

```tsx
import { CurioniLabsLogo } from "../components/brand/CurioniLabsLogo";

<CurioniLabsLogo variant="full" theme="dark" height={36} subtitle="COMMAND" />
<CurioniLabsLogo variant="mark" height={36} />
```

Static URLs (after deploy):

- `/brand/curionilabs/logo-full-dark.svg`
- `/brand/curionilabs/mark.svg`
