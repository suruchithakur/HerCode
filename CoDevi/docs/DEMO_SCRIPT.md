# 3-minute demo script

## 0. Setup (off-camera)

- Open `public/sample-barcodes.pdf` on a second screen.
- Open the app on a phone in portrait mode.

## 1. Pitch (20s)

> "A customer is standing in front of a wall of jackets in a Swiss outdoor store. They don't know which one fits their trip. **TrailMate** is the AI concierge that plans the trip at home, then guides them through the store and answers every question on the way."

## 2. Phase I — at home (60s)

1. From the landing screen tap **Plan a trip**.
2. Run through the wizard: "Weekend in Zermatt", Switzerland, December, 2 days, cold/snow, women, ski + hike, budget 800 CHF.
3. On the trip dashboard tap **Generate AI checklist**. Wait ~3s — show the recommendations counter pop.
4. Open **Swipe the recommendations** and swipe right on 4–5 items, left on 2.
5. Tap **Packing list & sizes** → tap generate. Show the grouped list and the green size badges (in stock).

## 3. Phase II — in store (75s)

1. From the trip dashboard tap **I'm at the store**.
2. Tap **I'm here — skip check** (or do the geolocation in person).
3. Open **Guided route**. Show the SVG map with numbered pins and the dashed walking path through zones.
4. Tap **Scan** next to the first pick.
5. Point the camera at the corresponding barcode in the PDF. The capture stops, the product card flips to a green **Match** state. Tap **Confirm**.
6. Back on the route screen the item now has a green check. Tap **Scan next item**.

## 4. Product chat (25s)

1. Scan any product, then tap **Ask AI** on the result.
2. Hit one of the suggested chips ("Is this warm enough for my trip?"). Show the streaming markdown answer grounded in the product object.

## 5. Close (15s)

> "Everything you saw — onboarding, AI checklist, swipe deck, store routing, Scandit scanning, product chat — runs in the browser, no install, no login. It's built on Scandit's web SDK and Lovable AI, ready to drop into any Swiss outdoor retailer tomorrow."

## Fallbacks if things go wrong

- **Camera blocked** → open the Lovable preview URL on a phone (HTTPS) or grant the browser camera permission.
- **AI rate limit (429)** → wait 5s and retry; the UI surfaces a toast.
- **No checklist returned** → the trip dashboard will let you re-generate.
