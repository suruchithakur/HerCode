import { AppShell } from "@/components/AppShell";
import { StoreMap, type MapPin } from "@/components/StoreMap";
import { groupByProductId, useProducts } from "@/lib/products";
import { buildStoreRoute, optimizedZoneOrder, pointAtArc, slotPosition, ZONE_INFO } from "@/lib/store-map";
import { useTrip, useTripStatus } from "@/lib/trip-store";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowUp, CheckCircle2, MapPin as MapPinIcon, ScanLine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/store/$tripId/nav")({
  head: () => ({ meta: [{ title: "Route — TrailMate" }] }),
  component: Nav,
});

function Nav() {
  const { tripId } = useParams({ from: "/store/$tripId/nav" });
  const trip = useTrip(tripId);
  const tripStatus = useTripStatus(tripId);
  const products = useProducts();
  const groups = useMemo(() => (products.data ? groupByProductId(products.data) : new Map()), [products.data]);
  const codeToProductId = useMemo(
    () => new Map((products.data ?? []).map((p) => [p.product_code, p.product_id])),
    [products.data]
  );

  const resolveGroup = (id: string) => groups.get(id) ?? groups.get(codeToProductId.get(id) ?? "");

  // Source product ids: swiped picks first; fall back to other saved match
  // shapes, then recommendations, so older trips still show a route.
  const routeSource = useMemo(() => {
    const rawTrip = trip as any;
    const candidates = [
      { ids: normalizeProductIds(rawTrip?.picks ?? []), fromPicks: true },
      { ids: normalizeProductIds(rawTrip?.matches ?? []), fromPicks: true },
      { ids: normalizeProductIds(rawTrip?.matched ?? []), fromPicks: true },
      { ids: normalizeProductIds(rawTrip?.shortlist ?? []), fromPicks: true },
      { ids: normalizeProductIds(rawTrip?.shortlisted ?? []), fromPicks: true },
      { ids: normalizeProductIds(rawTrip?.selectedProducts ?? []), fromPicks: true },
      { ids: normalizeProductIds(rawTrip?.confirmedCodes ?? []), fromPicks: true },
      { ids: normalizeProductIds(rawTrip?.recommendations ?? []), fromPicks: false },
    ];

    for (const candidate of candidates) {
      const resolved = candidate.ids.map(resolveGroup).filter(Boolean) as any[];
      if (resolved.length) return { ...candidate, resolved };
    }

    const fallback = Array.from(groups.values()).slice(0, 8) as any[];
    if (fallback.length && rawTrip) return { ids: fallback.map((g) => g.product_id), fromPicks: false, resolved: fallback };

    return { ids: [], fromPicks: true, resolved: [] as any[] };
  }, [trip, groups, codeToProductId]);

  const resolved = routeSource.resolved;

  // Optimized walking order: nearest-neighbor across zones, products in same
  // zone grouped together so the shopper doesn't backtrack.
  const CHECKOUT_ITEM = {
    product_id: "__checkout__",
    name: "Checkout",
    zone: "CHECKOUT",
    aisle: "—",
    variants: [] as any[],
    isCheckout: true,
  } as any;

  const ordered = useMemo(() => {
    const zoneOrder = optimizedZoneOrder(resolved.map((p) => p.zone));
    const items = zoneOrder.flatMap((z) => resolved.filter((p) => p.zone === z));
    // Always end the route at Checkout
    return items.length ? [...items, CHECKOUT_ITEM] : items;
  }, [resolved]);

  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  // Distribute pins inside each zone so multiple items don't overlap.
  const pins = useMemo<MapPin[]>(() => {
    const byZone = new Map<string, any[]>();
    for (const g of ordered) {
      if (g.isCheckout) continue;
      const arr = byZone.get(g.zone) ?? [];
      arr.push(g);
      byZone.set(g.zone, arr);
    }
    const slotIndex = new Map<string, number>();
    const confirmed = new Set(trip?.confirmedCodes ?? []);
    return ordered.map((g) => {
      if (g.isCheckout) {
        const pos = ZONE_INFO.CHECKOUT.pos;
        return { x: pos.x, y: pos.y, zone: "CHECKOUT", label: "Checkout", done: false };
      }
      const total = byZone.get(g.zone)!.length;
      const idx = slotIndex.get(g.zone) ?? 0;
      slotIndex.set(g.zone, idx + 1);
      const pos = slotPosition(g.zone, idx, total);
      const done = g.variants.some((v: any) => confirmed.has(v.product_code)) || skipped.has(g.product_id);
      return { x: pos.x, y: pos.y, zone: g.zone, label: g.name, done };
    });
  }, [ordered, trip?.confirmedCodes, skipped]);

  const confirmed = new Set(trip?.confirmedCodes ?? []);
  const isConfirmed = (g: any) => g.variants.some((v: any) => confirmed.has(v.product_code));

  const [selected, setSelected] = useState<number | null>(null);
  const nextIdx = pins.findIndex((p) => !p.done);
  const focusIdx = selected ?? (nextIdx >= 0 ? nextIdx : null);
  const focused = focusIdx != null ? ordered[focusIdx] : null;

  // ---- Walking simulator: arc-length position along the path ----
  const route = useMemo(
    () =>
      pins.length
        ? buildStoreRoute(pins.map((p) => ({ x: p.x, y: p.y })), pins.map((p) => p.zone))
        : null,
    [pins]
  );

  const [arc, setArc] = useState(0);
  const [walking, setWalking] = useState(true);
  const [stepCount, setStepCount] = useState(0);
  const [motionDetected, setMotionDetected] = useState(false);

  // Reset position when the route changes — keep auto-walking on
  useEffect(() => {
    setArc(0);
    setWalking(true);
    setStepCount(0);
  }, [pins.length, tripId]);

  // Per-pin arc thresholds; pause within 1.5 units of the next un-done pin
  const ARRIVE_RADIUS = 1.5;
  const targetArc = useMemo(() => {
    if (!route || nextIdx < 0) return route?.totalLen ?? 0;
    return route.pinArcs[nextIdx] ?? route.totalLen;
  }, [route, nextIdx]);

  const arrived = !!route && Math.abs(arc - targetArc) < ARRIVE_RADIUS && nextIdx >= 0;

  // Step-detected walking. Preferred: LinearAccelerationSensor (Generic
  // Sensor API) — gravity is already removed so peaks are clean. Fallback:
  // DeviceMotion accelerationIncludingGravity with a high-pass baseline.
  // Desktop with no motion stream slow-crawls so the demo still moves.
  useEffect(() => {
    if (!walking || !route) return;

    let cancelled = false;
    let removeListener: (() => void) | null = null;
    let sawMotion = false;

    const STEP_THRESHOLD = 1.2; // m/s^2 (linear accel, gravity removed)
    const FALLBACK_THRESHOLD = 1.6; // m/s^2 over baseline (includes gravity)
    const MIN_STEP_MS = 280;
    const UNITS_PER_STEP = 1.1;

    const advance = (delta: number) => {
      setArc((prev) => {
        const next = Math.min(prev + delta, targetArc);
        // Clamp at the pin but keep `walking` true so we auto-resume
        // toward the next stop as soon as the user scans/skips.
        return next;
      });
    };

    const peak = { lastStepT: 0, prevMag: 0, rising: false };
    const registerStep = () => {
      const now = performance.now();
      if (now - peak.lastStepT < MIN_STEP_MS) return;
      peak.lastStepT = now;
      setStepCount((s) => s + 1);
      advance(UNITS_PER_STEP);
    };

    // Path 1: LinearAccelerationSensor (Chrome/Android, Edge)
    const LAS = (window as any).LinearAccelerationSensor;
    let sensorStarted = false;
    if (LAS) {
      try {
        const sensor = new LAS({ frequency: 50 });
        const onReading = () => {
          sawMotion = true;
          setMotionDetected(true);
          const mag = Math.hypot(sensor.x ?? 0, sensor.y ?? 0, sensor.z ?? 0);
          if (mag > STEP_THRESHOLD && mag > peak.prevMag) peak.rising = true;
          else if (peak.rising && mag < peak.prevMag) { peak.rising = false; registerStep(); }
          peak.prevMag = mag;
        };
        sensor.addEventListener("reading", onReading);
        sensor.addEventListener("error", () => {});
        sensor.start();
        sensorStarted = true;
        removeListener = () => {
          try { sensor.stop(); } catch {}
          sensor.removeEventListener("reading", onReading);
        };
      } catch {
        sensorStarted = false;
      }
    }

    // Path 2: DeviceMotion fallback (Safari / iOS)
    if (!sensorStarted) {
      const baseline = { value: 9.8 };
      const onMotion = (e: DeviceMotionEvent) => {
        const a = e.accelerationIncludingGravity || e.acceleration;
        if (!a || a.x == null) return;
        sawMotion = true;
        setMotionDetected(true);
        const mag = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
        baseline.value = baseline.value * 0.9 + mag * 0.1;
        const dynamic = Math.abs(mag - baseline.value);
        if (dynamic > FALLBACK_THRESHOLD && dynamic > peak.prevMag) peak.rising = true;
        else if (peak.rising && dynamic < peak.prevMag) { peak.rising = false; registerStep(); }
        peak.prevMag = dynamic;
      };
      const attach = () => {
        if (cancelled) return;
        window.addEventListener("devicemotion", onMotion);
        removeListener = () => window.removeEventListener("devicemotion", onMotion);
      };
      const DM = (window as any).DeviceMotionEvent;
      if (DM && typeof DM.requestPermission === "function") {
        DM.requestPermission().then((res: string) => { if (res === "granted") attach(); }).catch(() => {});
      } else if (DM) {
        attach();
      }
    }

    // Desktop fallback: if nothing arrives within 1.2s, crawl forward slowly.
    let rafId: number | null = null;
    let last = 0;
    const tick = (t: number) => {
      if (cancelled) return;
      if (last === 0) { last = t; rafId = requestAnimationFrame(tick); return; }
      const dt = (t - last) / 1000;
      last = t;
      if (!sawMotion && t > 1200) advance(2.2 * dt);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (removeListener) removeListener();
    };
  }, [walking, route, targetArc]);

  const walker = route ? pointAtArc(route, arc) : null;

  // Compass-style heading hint
  const headingLabel = useMemo(() => {
    if (!walker) return "";
    const { x, y } = walker.heading;
    if (Math.hypot(x, y) < 0.001) return "";
    if (Math.abs(x) > Math.abs(y)) return x > 0 ? "Head right (east)" : "Head left (west)";
    return y > 0 ? "Head down (south)" : "Head up (north)";
  }, [walker]);

  const distanceToNext = route && nextIdx >= 0 ? Math.max(0, targetArc - arc) : 0;

  return (
    <AppShell title="Your route" back={`/store/${tripId}`}>
      {tripStatus === "loading" || products.isLoading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading your route…
        </div>
      ) : ordered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No products yet. Go back and generate matches or swipe recommendations first.
        </div>
      ) : (
        <>
          {!routeSource.fromPicks && (
            <div className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              Showing your AI recommendations — swipe to lock in your picks for a tighter route.
            </div>
          )}
          {focused && (
            <div className={`mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${arrived ? "border-emerald-400 bg-emerald-50" : "border-primary/30 bg-primary/5"}`}>
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: ZONE_INFO[focused.zone]?.color ?? "#888" }}
              >
                {(focusIdx ?? 0) + 1}
              </span>
              <span className="flex-1 truncate">
                {arrived ? (
                  <>
                    <span className="font-semibold text-emerald-700">You've arrived</span>
                    <span className="text-muted-foreground"> · {focused.name} · Aisle {focused.aisle}</span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Next: {focused.name}</span>
                    <span className="text-muted-foreground"> · {ZONE_INFO[focused.zone]?.name} · Aisle {focused.aisle}</span>
                  </>
                )}
              </span>
            </div>
          )}
          <StoreMap
            pins={pins}
            selectedIndex={focusIdx}
            onSelect={(i) => setSelected(i === selected ? null : i)}
            userPos={walker?.pos ?? null}
            heading={walker?.heading ?? null}
            arrived={arrived}
          />

          {/* Live nav banner */}
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${arrived ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"}`}
              style={
                walker && !arrived
                  ? { transform: `rotate(${(Math.atan2(walker.heading.y, walker.heading.x) * 180) / Math.PI + 90}deg)`, transition: "transform 200ms" }
                  : undefined
              }
            >
              {arrived ? <MapPinIcon className="h-5 w-5" /> : <ArrowUp className="h-5 w-5" />}
            </div>
            <div className="flex-1 text-sm">
              {arrived && focused?.isCheckout ? (
                <>
                  <div className="font-semibold text-emerald-700">You've reached Checkout</div>
                  <div className="text-xs text-muted-foreground">Pay & finish your trip.</div>
                </>
              ) : arrived ? (
                <>
                  <div className="font-semibold text-emerald-700">Scan it to check off this stop</div>
                  <div className="text-xs text-muted-foreground">Auto-walking resumes after you scan.</div>
                </>
              ) : focused?.isCheckout ? (
                <>
                  <div className="font-semibold">{headingLabel || "Heading to Checkout"}</div>
                  <div className="text-xs text-muted-foreground">
                    ≈ {distanceToNext.toFixed(0)} steps to Checkout
                    {motionDetected && <span className="ml-1">· {stepCount} steps detected</span>}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold">{headingLabel || "Follow the line"}</div>
                  <div className="text-xs text-muted-foreground">
                    ≈ {distanceToNext.toFixed(0)} steps to {focused?.name}
                    {motionDetected
                      ? <span className="ml-1">· {stepCount} steps detected</span>
                      : <span className="ml-1">· tracking your motion…</span>}
                  </div>
                </>
              )}
            </div>
            {arrived && focused?.isCheckout ? (
              <Link
                to="/trips/$tripId"
                params={{ tripId }}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Finish
              </Link>
            ) : arrived ? (
              <Link
                to="/store/$tripId/scan"
                params={{ tripId }}
                search={focused ? { expect: focused.product_id } : {}}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Scan
              </Link>
            ) : null}
          </div>

          {nextIdx >= 0 && focused && !focused.isCheckout && (
            <button
              onClick={() => {
                setSkipped((prev) => {
                  const next = new Set(prev);
                  next.add(focused.product_id);
                  return next;
                });
                if (route) {
                  setArc(Math.min(targetArc + ARRIVE_RADIUS + 0.1, route.totalLen));
                }
                setSelected(null);
              }}
              className="mt-2 w-full rounded-xl border border-border bg-card py-2 text-xs text-muted-foreground hover:bg-muted/50"
            >
              Skip this stop · go to next item
            </button>
          )}


          <p className="mt-3 text-center text-xs text-muted-foreground">
            Tap any stop on the map or list to focus it. The blue arrow shows which way to walk.
          </p>


          <ol className="mt-5 space-y-3">
            {ordered.map((g, i) => {
              const done = isConfirmed(g);
              const zone = ZONE_INFO[g.zone];
              const isFocus = i === focusIdx;
              return (
                <li
                  key={g.product_id}
                  onClick={() => setSelected(i === selected ? null : i)}
                  className={`flex cursor-pointer gap-3 rounded-xl border bg-card p-3 transition ${done ? "border-emerald-300 bg-emerald-50/40" : isFocus ? "border-primary/60 bg-primary/5 ring-2 ring-primary/30" : "border-border hover:border-primary/30"}`}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: zone?.color ?? "#888" }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{g.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {g.isCheckout ? "Final stop · pay & leave" : `Zone ${g.zone} · ${zone?.name} · Aisle ${g.aisle}`}
                    </div>
                  </div>
                  {g.isCheckout ? (
                    <MapPinIcon className="h-5 w-5 self-center text-slate-500" />
                  ) : done ? (
                    <CheckCircle2 className="h-5 w-5 self-center text-emerald-500" />
                  ) : (
                    <Link
                      to="/store/$tripId/scan"
                      params={{ tripId }}
                      search={{ expect: g.product_id }}
                      className="self-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      <ScanLine className="mr-1 inline h-3 w-3" /> Scan
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>

          <Link
            to="/store/$tripId/scan"
            params={{ tripId }}
            className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 p-4 font-semibold text-white"
          >
            <ScanLine className="h-5 w-5" /> Scan next item
          </Link>
        </>
      )}
    </AppShell>
  );
}

function normalizeProductIds(items: unknown[]): string[] {
  const ids = items
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "product_id" in item) return String((item as { product_id?: unknown }).product_id ?? "");
      return "";
    })
    .map((id) => id.trim())
    .filter(Boolean);
  return Array.from(new Set(ids));
}
