# Scandit × HerCode Challenge — coverage

Original brief: build an AI concierge for a Swiss outdoor retailer that helps shoppers find and buy the right gear in the store, on their phone, on top of Scandit's scanning and AR technology.

## How TrailMate addresses each requirement

| Brief requirement | TrailMate feature |
| --- | --- |
| Help a shopper standing in front of a wall of jackets | `/store/$tripId/nav` orders only the user's picks along the store path with numbered pins. |
| Decide what fits their trip / budget / needs | Onboarding wizard captures country, month, weather, gender, sizing, style, days, activities, budget, free-form notes. |
| On their phone | Mobile-first layout (max-width md container, sticky header, large tap targets, swipe gestures). |
| Built on Scandit | `@scandit/web-datacapture-core` + `@scandit/web-datacapture-barcode` v8. Real camera-based Barcode Capture on `/store/$tripId/scan`. |
| Pairs with Zenline (what the store stocks) | TrailMate consumes the provided `products.json` (with zone/aisle/stock_total/stock_front) — the same shape Zenline would produce. |

## Phase I — at home

Implemented:
- Multi-step onboarding wizard with all requested fields.
- AI checklist generation from the full catalog using Lovable AI structured output (Gemini Flash).
- Tinder-style swipe deck with framer-motion drag, KEEP/SKIP labels, undo via re-generation.
- AI-grouped packing list with one-line notes per item and in-stock size badges from `products.json`.
- Trips list with multi-trip support and delete; "create new trip" always available.

Deferred (documented in roadmap):
- Multi-store recommendation page with map deep-link (mocked store coord in the nav gate today).
- AI-generated hero photos per product (placeholder gradient + category emoji used for speed and zero credit spend; the cache plumbing is sketched in `src/components/ProductCard.tsx`).

## Phase II — in store

Implemented:
- Geolocation prompt + Haversine distance + "I'm here" override for demos.
- Optimized walking route across zones A → B → C → F → D → E → G → checkout, rendered as an SVG mirroring the supplied store map.
- Per-pick **Scan** action with `?expect=product_id` to verify the right item.
- Scandit Barcode Capture with EAN-13/UPC-A/Code128/Code39/QR/Data Matrix enabled, camera lifecycle cleanup, error fallback.
- Three branches after scan: ✅ Match → confirm + tick off route; ⚠️ Same `product_id`, different size → "on your list"; ❌ Unknown → chat handoff.
- Product chat at `/product/$code` with suggested prompt chips, streaming responses, markdown rendering, and a system prompt grounded in the product + same-category alternatives.

Deferred:
- MatrixScan AR shelf highlights (green ring for picks vs gray) — placeholder route in place, BarcodeAr APIs documented in the Scandit web skill we reference.

## Where the Scandit assets live

- `products.json` → `public/data/products.json`
- `store-map.png` → `public/store-map.png` (rendered as inline SVG in `src/components/StoreMap.tsx`)
- `sample-barcodes.pdf` → `public/sample-barcodes.pdf`

## Out of scope (intentionally)

- Authentication / multi-device sync — `localStorage` only, matches the hackathon "one shopper, one phone" demo.
- Payments / checkout — the brief is "find and buy"; we stop at the confirm-scan step.
- Inventory mutations — we read stock from the static JSON.
