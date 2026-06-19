## Goal

Make the "Scan a product" page the centerpiece of spontaneous shopping: after every successful scan, drive the shopper through a clear yes/no decision that either checks the item off the shopping list or adds it (and optionally checks it off).

## New scan result flow

After a barcode resolves to a catalog product, show one of two prompts (replacing today's "Confirm / Ask AI / Scan another" buttons).

**A. Product IS on the trip's pick list**

> Already on your list! Ready to buy this?

- **Yes, buying it** → add `product_code` to `trip.confirmedCodes` (checks it off the shopping list), show a brief "Checked off" confirmation, then return to scanning.
- **No, not now** → do nothing, return to scanning.

**B. Product is NOT on the list**

> Ooo this isn't on your list — but it's an excellent choice!

Three options:
1. **Buy it** → add `product_id` to `trip.picks` AND add `product_code` to `trip.confirmedCodes` (added + checked off).
2. **Add to list for now** → add `product_id` to `trip.picks` only (added, not checked off).
3. **Leave it behind** → do nothing, return to scanning.

After any choice, the camera re-enables so the user can scan the next item without leaving the page.

## UI details

- Keep the existing product card (brand, name, color/size, price, zone/aisle) above the action buttons so the user can confirm it's the right item.
- A small badge at the top of the card indicates the state: green "On your list" for case A, blue "New find" for case B.
- Buttons are stacked, full-width, with the primary action (Yes / Buy it) in emerald and secondary actions in neutral styling. "Leave behind" is a quiet tertiary button.
- Toast / inline banner after each action: "Checked off your list", "Added & checked off", "Added to your list", or nothing for "Leave behind".
- Unknown barcode (not in catalog) keeps today's "Not in catalog" message + Scan again.
- Remove the auto-navigation to the Guided route map after confirming — the user stays on the scan page to continue scanning.

## Technical details

- File: `src/routes/store.$tripId.scan.tsx`.
- Reuse `updateTrip(tripId, { picks, confirmedCodes })` from `src/lib/trip-store.ts`. Use `Set` to dedupe both arrays before saving.
- Replace the current `confirmScan` + bottom button cluster with a small `<ScanDecision>` block driven by `isOnList = trip.picks?.includes(product.product_id)`.
- After a decision, reset local `scanned` state to `null` and call `capture.setEnabled(true)` again so the Scandit `BarcodeCapture` instance resumes. Keep `codeDuplicateFilter` so the same item isn't re-prompted instantly.
- Drop the `expect` search-param branching from the buttons (still fine to highlight a match visually) since the flow no longer routes back to the map.
- No changes to the Scandit context/camera setup or to the AR shelf page.

## Out of scope

- Changes to the shopping-list / picks display elsewhere (it already reads `picks` and `confirmedCodes`).
- AR shelf flow, guided route, or product detail page.
- Persisting a "left behind" history.
