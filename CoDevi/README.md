# TrailMate — Scandit × HerCode Hackathon

> AI concierge for a Swiss outdoor retailer. Plan your trip at home, get an AI-curated gear checklist, then let TrailMate guide you through the store with Scandit scanning, AR shelf highlighting, product chat, and step-aware indoor navigation.

Built for the **Scandit × HerCode 2026 hackathon** on top of:

- **[Scandit Web SDK](https://docs.scandit.com/sdks/web/)** — Barcode Capture (confirm-scan) + MatrixScan AR (shelf overlay)
- **Lovable AI Gateway** — `google/gemini-3-flash-preview` for checklist, packing list, product chat, and trip-fit assessment
- **TanStack Start** (React 19, Vite 7) — file-based routing, server functions, streaming chat route
- **Tailwind v4** + **shadcn-style** components, **framer-motion** for the swipe deck

## Features

### Trip Planning (At Home)

- **Onboarding Wizard** — Five-step form capturing trip name, country, month, weather, body fit (gender/height/weight), sizing notes, style preferences, budget, and planned activities.
- **AI-Personalized Gear Checklist** — Gemini generates tailored product recommendations from the store's 249-SKU catalog (69 unique products across 7 zones), grounded in trip context.
- **Tinder-Style Swipe Deck** — Swipe through AI recommendations with match/pass gestures. Framer-motion powered drag animations with visual "MATCH" / "PASS" badges.
- **AI Packing List** — Second AI pass groups selected picks by category with packing notes and real-time in-store size availability badges (stock counts per size).
- **Trip Dashboard** — View all trips in localStorage, resume the latest, and see match counts at a glance.

### In-Store Experience

- **Location Gate** — Verifies the shopper is at the selected store (or "I'm here" for demo).
- **Optimized Store Route** — Nearest-neighbor algorithm orders picks along the store's walking path (A → B → C → top → D → E → F → G → checkout) so the shopper doesn't backtrack.
- **Interactive Store Map** — Inline SVG map with color-coded zone pins, user position arrow, heading indicator, and a single route line connecting all stops.
- **Step-Counter Navigation** — Walking mode uses the phone's `LinearAccelerationSensor` (Generic Sensor API) as primary step detection, with `DeviceMotionEvent` fallback for iOS/Safari. The walker advances only when real steps are detected, pausing at each item until arrival.
- **Skip Stop** — Mark an item as skipped and automatically jump arc position to the next un-done pin on the route.
- **Scandit Barcode Capture** — Camera-based barcode scanner supporting EAN-13, EAN-8, UPC-E, Code128, Code39, QR, and DataMatrix. Scanned code → instant catalog lookup → match against expected picks.
- **MatrixScan AR Shelf Highlight** — Scandit `BarcodeAr` scans an entire shelf of barcodes simultaneously. Products on your list get pulsing emerald-green dot overlays; other catalog items get subtle neutral dots. Live counter shows "N of M from your list" with a scrollable checklist below.
- **Trip-Fit Assessment** — Tap any scanned product to see if it's suitable for your trip. AI evaluates temperature rating, waterproofing, weight, material, and activity match against your trip's weather, month, country, and activities. Verdicts: "Good for your trip", "Check fit", or "Not for this trip" with detailed reasoning.
- **Product Detail + AI Chat** — Open any product to view specs, variants, and stock. Built-in chat with TrailMate (grounded in product data + same-category alternatives) for questions like "Is this warm enough?", "Show me cheaper alternatives", "How does the material feel?".
- **Manual List Management** — Check off items, remove picks, or add newly discovered products to your list directly from the scan screen.

### Architecture & Tech

- All trip data lives in `localStorage` (`trailmate:trips`). No accounts required.
- `products.json` is bundled at `public/data/products.json` and indexed in-memory.
- AI runs server-side through `createServerFn` (checklist, packing) and a streaming server route `/api/chat` (product chat).
- Scandit context initialized once (singleton in `src/lib/scandit.ts`) and reused across scan/AR screens.
- Store map rendered as an inline SVG mirroring `public/store-map.png`.

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing + onboarding wizard |
| `/trips` | All trips (localStorage) |
| `/trips/new` | Onboarding wizard |
| `/trips/$tripId` | Trip dashboard + AI checklist trigger |
| `/trips/$tripId/swipe` | Swipe deck |
| `/trips/$tripId/packing` | AI packing list + size availability |
| `/store/$tripId` | In-store hub (location gate) |
| `/store/$tripId/nav` | Optimized route + step-aware map |
| `/store/$tripId/scan` | Scandit Barcode Capture + fit assessment |
| `/store/$tripId/ar` | MatrixScan AR shelf overlay |
| `/product/$code` | Product detail + AI chat |
| `/api/chat` | Streaming chat endpoint (AI SDK) |

## Run it

```bash
bun install
bun dev
```

Open the printed URL. On desktop the camera scan screen will ask for camera permission — best demo is on a real phone over HTTPS (Lovable preview is already HTTPS).

`LOVABLE_API_KEY` is provisioned automatically by the Lovable Cloud AI Gateway. The Scandit license key is embedded in `src/lib/scandit.ts` for the hackathon demo.

See [`docs/SETUP.md`](./docs/SETUP.md) and [`docs/DEMO_SCRIPT.md`](./docs/DEMO_SCRIPT.md).

## Assets

- `public/data/products.json` — Scandit's sample catalog (249 SKUs)
- `public/store-map.png` — store layout reference
- `public/sample-barcodes.pdf` — printable demo barcodes

## Roadmap

- Real AI-generated hero photos per product (cached by `product_id`)
- Multi-store selector + Google Maps deep link
- Saved "ideal pack" templates that auto-fill onboarding
- Trip sharing via URL hash

## License

MIT — built for the HerCode hackathon.
