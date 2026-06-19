// Store layout calibrated to /public/store-map.png (1720x1240).
// All positions are percentages of the PNG so an SVG overlay with
// viewBox="0 0 100 100" and preserveAspectRatio="none" lines up exactly.
export const ZONE_ORDER = ["A", "B", "C", "F", "D", "E", "G"] as const;

export const ENTRANCE_POS = { x: 35.5, y: 95 };
export const EXIT_POS = { x: 64.8, y: 95 };

export const ZONE_INFO: Record<
  string,
  { name: string; color: string; pos: { x: number; y: number }; box: { x: number; y: number; w: number; h: number } }
> = {
  C: { name: "Tents & Shelter", color: "#f5b97a", pos: { x: 18.9, y: 31.7 }, box: { x: 11.6, y: 21.4, w: 14.6, h: 20.5 } },
  B: { name: "Footwear",        color: "#82c997", pos: { x: 18.9, y: 53.4 }, box: { x: 11.6, y: 43.1, w: 14.6, h: 20.6 } },
  A: { name: "Jackets & Shells",color: "#7fb3d5", pos: { x: 18.9, y: 75.8 }, box: { x: 11.6, y: 64.9, w: 14.6, h: 21.8 } },
  F: { name: "Base Layers & Clothing", color: "#84d4cc", pos: { x: 50.3, y: 36.9 }, box: { x: 41.9, y: 21.4, w: 16.8, h: 31.0 } },
  G: { name: "Accessories",     color: "#f0d672", pos: { x: 50.3, y: 73.6 }, box: { x: 41.9, y: 60.5, w: 16.8, h: 26.2 } },
  D: { name: "Sleep",           color: "#bda5f0", pos: { x: 79.9, y: 31.7 }, box: { x: 71.5, y: 21.4, w: 16.9, h: 20.5 } },
  E: { name: "Backpacks",       color: "#f3a5bd", pos: { x: 79.9, y: 53.4 }, box: { x: 71.5, y: 43.1, w: 16.9, h: 20.6 } },
  CHECKOUT: { name: "Checkout", color: "#cccccc", pos: { x: 79.9, y: 75.8 }, box: { x: 71.5, y: 64.9, w: 16.9, h: 21.8 } },
};

export const MAP_IMAGE_SRC = "/store-map.png";
export const MAP_ASPECT_RATIO = 1720 / 1240;

export function orderZones(zones: string[]): string[] {
  const set = new Set(zones);
  return ZONE_ORDER.filter((z) => set.has(z));
}

/**
 * Nearest-neighbor walk from the entrance through every unique zone.
 * Good enough for ~10 stops and avoids backtracking.
 */
export function optimizedZoneOrder(zones: string[]): string[] {
  const remaining = Array.from(new Set(zones)).filter((z) => ZONE_INFO[z]);
  const out: string[] = [];
  let cur = ENTRANCE_POS;
  while (remaining.length) {
    let bestI = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const p = ZONE_INFO[remaining[i]].pos;
      const d = (p.x - cur.x) ** 2 + (p.y - cur.y) ** 2;
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
    const z = remaining.splice(bestI, 1)[0];
    out.push(z);
    cur = ZONE_INFO[z].pos;
  }
  return out;
}

/**
 * Grid-distribute N pins inside a zone's box so multiple items in the same
 * aisle don't overlap.
 */
export function slotPosition(zone: string, index: number, total: number): { x: number; y: number } {
  const info = ZONE_INFO[zone];
  if (!info) return { x: 50, y: 50 };
  const { x, y, w, h } = info.box;
  if (total <= 1) return { x: x + w / 2, y: y + h / 2 };
  const cols = Math.min(3, total);
  const rows = Math.ceil(total / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const padX = w * 0.22;
  const padY = h * 0.22;
  const stepX = cols > 1 ? (w - padX * 2) / (cols - 1) : 0;
  const stepY = rows > 1 ? (h - padY * 2) / (rows - 1) : 0;
  return { x: x + padX + col * stepX, y: y + padY + row * stepY };
}

// ---------- Route building (orthogonal aisle walking) ----------
export const LEFT_CORRIDOR = 34;
export const RIGHT_CORRIDOR = 65;
export const TOP_CONNECTOR = 15;
export const BOTTOM_CONNECTOR = 92;

type Pt = { x: number; y: number };

function corridorForZone(zone: string, fallback: number): number {
  const info = ZONE_INFO[zone];
  if (!info) return fallback;
  const cx = info.box.x + info.box.w / 2;
  if (cx < 35) return LEFT_CORRIDOR;
  if (cx > 60) return RIGHT_CORRIDOR;
  return fallback;
}

export type StoreRoute = {
  points: Pt[];
  cumulative: number[]; // arc length at each point
  totalLen: number;
  pinArcs: number[]; // arc length at which each input pin sits
};

export function buildStoreRoute(pins: Pt[], _pinZones: string[]): StoreRoute {
  // Simple polyline: entrance → each pin in order → exit.
  const points: Pt[] = [ENTRANCE_POS];
  const pinArcs: number[] = new Array(pins.length).fill(0);
  for (let i = 0; i < pins.length; i++) {
    points.push({ x: pins[i].x, y: pins[i].y });
    pinArcs[i] = points.length - 1;
  }
  points.push(EXIT_POS);

  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
  }
  const arcs = pinArcs.map((idx) => cumulative[idx]);
  return { points, cumulative, totalLen: cumulative[cumulative.length - 1], pinArcs: arcs };
}

export function pointAtArc(route: StoreRoute, s: number): { pos: Pt; heading: Pt } {
  const { points, cumulative, totalLen } = route;
  const clamped = Math.max(0, Math.min(s, totalLen));
  for (let i = 1; i < points.length; i++) {
    if (clamped <= cumulative[i]) {
      const segLen = cumulative[i] - cumulative[i - 1] || 1;
      const t = (clamped - cumulative[i - 1]) / segLen;
      const a = points[i - 1];
      const b = points[i];
      return {
        pos: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        heading: { x: b.x - a.x, y: b.y - a.y },
      };
    }
  }
  const last = points[points.length - 1];
  const prev = points[points.length - 2] ?? last;
  return { pos: last, heading: { x: last.x - prev.x, y: last.y - prev.y } };
}
