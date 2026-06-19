# Setup

## Prerequisites

- [Bun](https://bun.sh/) (or npm/pnpm)
- A modern browser with camera access for the scan flow

## Install

```bash
bun install
bun dev
```

The app runs on the URL printed by Vite. Open it on your phone for the best demo (camera + swipe). The Lovable preview URL is already HTTPS, which the browser requires for `navigator.mediaDevices.getUserMedia`.

## Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `LOVABLE_API_KEY` | Auto-injected by Lovable Cloud | Server-only auth to Lovable AI Gateway. |
| Scandit license key | Hard-coded in `src/lib/scandit.ts` | Scandit license keys are publishable and safe to ship in the client bundle. Rotate by editing that file. |

No `.env` setup needed for the hackathon demo.

## Where things live

```
public/
  data/products.json     Scandit sample catalog
  store-map.png          Store layout reference
  sample-barcodes.pdf    Printable demo codes

src/
  routes/                File-based pages + /api/chat
  components/            AppShell, ProductCard, StoreMap
  lib/                   Trip store, products loader, AI server fns, Scandit init
```

## Scanning demo without a real shelf

1. Open `public/sample-barcodes.pdf` on a second screen (laptop monitor, second phone).
2. Open the app on a phone, walk through the onboarding, generate the checklist, swipe a few picks.
3. From `/store/$tripId/nav`, tap "Scan" next to any pick.
4. Point the camera at the matching barcode in the PDF — the screen flips to a green "Match" card.

## Deploy

The app is a regular TanStack Start project — `bun run build` produces a deployable output. The Lovable preview is the easiest path; the same project ships via the Publish button in the editor.
