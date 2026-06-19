# Architecture

## Stack

- **TanStack Start v1** (React 19, Vite 7, edge runtime). File-based routing under `src/routes/`.
- **TanStack Query** for client caches (`useProducts`).
- **AI SDK v6** (`ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible`).
- **Lovable AI Gateway** at `https://ai.gateway.lovable.dev/v1`, model `google/gemini-3-flash-preview`.
- **Scandit Web SDK v8** (`@scandit/web-datacapture-core`, `@scandit/web-datacapture-barcode`).
- **framer-motion** for the swipe deck.
- **react-markdown** for chat bubbles.

## Data flow

```
products.json (public/data) ──► useProducts (TanStack Query)
                                    │
                                    ▼
trip wizard ──► localStorage ──► trip dashboard ──► createServerFn
                                    │                  │
                                    │                  ▼
                                    │       Lovable AI Gateway
                                    │       (structured output)
                                    │                  │
                                    ▼                  ▼
                               trip.picks ◄── recommendations
                                    │
                                    ▼
                            store nav + scan
                                    │
                                    ▼
                       Scandit BarcodeCapture (camera)
                                    │
                                    ▼
                  product.product_code lookup → /product/$code
                                    │
                                    ▼
                       /api/chat (streaming) + useChat
```

## Modules

| Path | Role |
| --- | --- |
| `src/lib/products.ts` | Loads + groups `products.json` (variants by `product_id`). |
| `src/lib/trip-store.ts` | localStorage-backed Trip store with React hooks (`useTrips`, `useTrip`). |
| `src/lib/store-map.ts` | Zone order along the walking path; zone colors and SVG coordinates. |
| `src/lib/ai-gateway.server.ts` | OpenAI-compatible provider for Lovable AI Gateway. |
| `src/lib/ai.functions.ts` | `generateChecklist`, `generatePackingList` (Output.object structured generation). |
| `src/lib/scandit.ts` | Scandit singleton — `DataCaptureContext.forLicenseKey(...)` once. |
| `src/routes/api/chat.ts` | Streaming chat endpoint (`streamText` + `toUIMessageStreamResponse`). |
| `src/components/StoreMap.tsx` | SVG of the store with numbered pins + dashed route. |
| `src/components/ProductCard.tsx` | Product hero (category emoji + zone-tinted gradient) + spec chips. |

## AI prompt design

**Checklist (`generateChecklist`)** — one-shot structured output with Zod schema:
```
{ picks: [{ product_id, reason }] }
```
System prompt frames the model as a Swiss outdoor advisor; user prompt is `TRIP` + the full catalog (one entry per `product_id`). Returns 8–14 picks with one-line shopper-facing rationales.

**Packing list (`generatePackingList`)** — same shape, grouped:
```
{ groups: [{ title, items: [{ product_id, note }] }] }
```
Constrained to `product_id`s the user picked.

**Product chat (`/api/chat`)** — `streamText` with a route-specific `system` message containing the full product, its variants (size/color/stock), and the same-category alternatives. The model is told to be concise (3–5 sentences), use markdown bullets when helpful, and ground answers in the data.

## Scandit integration

- One `DataCaptureContext` per session (`ensureScanditContext()`), reused across `/store/$tripId/scan` and any future AR routes.
- Library files served from CDN: `https://cdn.jsdelivr.net/npm/@scandit/web-datacapture-barcode@8/sdc-lib/`.
- Symbologies enabled: EAN-13/UPC-A, EAN-8, UPC-E, Code 128, Code 39, QR, Data Matrix. The `products.json` codes are EAN-13.
- `didScan` → `session.newlyRecognizedBarcode.data` → catalog lookup by `product_code`.
- Camera lifecycle: started on mount via `Camera.pickBestGuess()` + `switchToDesiredState(On)`; stopped in the React cleanup with `switchToDesiredState(Off)`.

## Route optimization

The store walking path (per the sample store map) is: entrance → A (Jackets) → B (Footwear) → C (Tents) → across the top → F (Base Layers) → D (Sleep) → E (Backpacks) → G (Accessories) → checkout → exit.

`orderZones(zones)` in `src/lib/store-map.ts` keeps only zones that contain picks and emits them in walking order. Picks are then grouped under each zone and numbered 1..N on the map.

## State

| Where | What |
| --- | --- |
| localStorage `trailmate:trips` | All trips with onboarding, recommendations, picks, skipped, packing, confirmedCodes. |
| React state (route components) | Wizard step, swipe queue index, scan capture lifecycle, chat input. |
| TanStack Query | `products` (loaded once, stale-time Infinity). |

No backend persistence — everything in the browser. This keeps the hackathon demo zero-setup.
