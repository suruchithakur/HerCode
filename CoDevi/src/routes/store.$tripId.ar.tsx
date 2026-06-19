import { AppShell } from "@/components/AppShell";
import { useProducts, groupByProductId } from "@/lib/products";
import { useTrip, updateTrip } from "@/lib/trip-store";
import { ensureScanditContext } from "@/lib/scandit";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarcodeAr,
  BarcodeArSettings,
  BarcodeArView,
  BarcodeArCircleHighlight,
  BarcodeArCircleHighlightPreset,
  Symbology,
  type Barcode,
} from "@scandit/web-datacapture-barcode";
import { Brush, Color } from "@scandit/web-datacapture-core";
import { CheckCircle2, Circle, ScanLine } from "lucide-react";

export const Route = createFileRoute("/store/$tripId/ar")({
  head: () => ({ meta: [{ title: "AR shelf — TrailMate" }] }),
  component: AR,
});

function AR() {
  const { tripId } = useParams({ from: "/store/$tripId/ar" });
  const trip = useTrip(tripId);
  const products = useProducts();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [spotted, setSpotted] = useState<Set<string>>(new Set());
  const [lastSeen, setLastSeen] = useState<
    | { code: string; status: "pick" | "catalog" | "unknown"; name?: string }
    | null
  >(null);

  // Picks for the checklist UI
  const pickGroups = useMemo(() => {
    if (!products.data || !trip?.picks) return [];
    const groups = groupByProductId(products.data);
    return trip.picks.map((id) => groups.get(id)).filter(Boolean) as ReturnType<
      typeof groupByProductId
    > extends Map<string, infer V>
      ? V[]
      : never;
  }, [products.data, trip?.picks]);

  // Refs so the highlight callback (created once) always sees latest data.
  // We resolve picks INSIDE the callback by code -> product -> product_id,
  // which is robust no matter what shape `trip.picks` ends up in.
  const productsRef = useRef(products.data);
  const pickIdsRef = useRef<Set<string>>(new Set());
  const pickCodesRef = useRef<Set<string>>(new Set());
  const tripRef = useRef(trip);
  useEffect(() => {
    productsRef.current = products.data;
    const picks = new Set(trip?.picks ?? []);
    pickIdsRef.current = picks;
    // Treat picks as both product_ids AND raw product_codes for safety.
    pickCodesRef.current = new Set(trip?.picks ?? []);
    tripRef.current = trip;
  }, [products.data, trip]);

  useEffect(() => {
    if (!products.data || !trip) return;
    let cleanup = () => {};
    let cancelled = false;

    (async () => {
      try {
        const context = await ensureScanditContext();
        if (cancelled) return;

        const settings = new BarcodeArSettings();
        settings.enableSymbologies([
          Symbology.EAN13UPCA,
          Symbology.EAN8,
          Symbology.UPCE,
          Symbology.Code128,
          Symbology.Code39,
          Symbology.Code93,
          Symbology.InterleavedTwoOfFive,
          Symbology.QR,
          Symbology.DataMatrix,
          Symbology.PDF417,
        ]);

        const barcodeAr = await BarcodeAr.forContext(context, settings);

        const emerald = Color.fromHex("#10B981");
        const pickFill = Color.fromHex("#10B98166");
        const pickBrush = new Brush(pickFill, emerald, 4);

        // Almost invisible — confirms the SDK sees the code, but doesn't compete
        // with the picks on a shelf full of barcodes.
        const ghost = Color.fromHex("#FFFFFF22");
        const ghostStroke = Color.fromHex("#FFFFFF55");
        const neutralBrush = new Brush(ghost, ghostStroke, 1);

        const view = await BarcodeArView.create(containerRef.current!, context, barcodeAr);

        view.highlightProvider = {
          highlightForBarcode: async (barcode: Barcode, callback: (h: any) => void) => {
            const code = (barcode.data ?? "").trim();
            const allProducts = productsRef.current ?? [];
            const product = allProducts.find((p) => p.product_code === code);
            const inCatalog = !!product;
            // A scan is a "pick" if any of: its product_id is on the list,
            // its raw product_code is on the list, OR any variant of the same
            // product_id is on the list.
            const isPick =
              (product && pickIdsRef.current.has(product.product_id)) ||
              pickCodesRef.current.has(code) ||
              false;

            // eslint-disable-next-line no-console
            console.log("[AR] scanned", { code, isPick, inCatalog, name: product?.name });

            setLastSeen({
              code,
              status: isPick ? "pick" : inCatalog ? "catalog" : "unknown",
              name: product?.name,
            });

            if (isPick && product) {
              setSpotted((prev) => {
                if (prev.has(product.product_id)) return prev;
                const next = new Set(prev);
                next.add(product.product_id);
                const confirmed = new Set(tripRef.current?.confirmedCodes ?? []);
                confirmed.add(product.product_code);
                updateTrip(tripId, { confirmedCodes: [...confirmed] });
                return next;
              });
              const hl = BarcodeArCircleHighlight.create(barcode, BarcodeArCircleHighlightPreset.Dot);
              hl.brush = pickBrush;
              hl.isPulsing = true;
              callback(hl);
            } else {
              // Neutral dot so the user can SEE the scanner is reading,
              // but doesn't draw attention to non-picks.
              const hl = BarcodeArCircleHighlight.create(barcode, BarcodeArCircleHighlightPreset.Dot);
              hl.brush = neutralBrush;
              hl.isPulsing = false;
              callback(hl);
            }
          },
        };

        await view.start();

        cleanup = () => {
          view.stop().catch(() => {});
          view.remove();
        };
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
    // Run once when data is ready; refs handle subsequent updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.data ? true : false, trip ? true : false]);

  const total = pickGroups.length;
  const found = spotted.size;

  return (
    <AppShell title="AR shelf check" back={`/store/${tripId}`}>
      <div className="relative h-[55vh] w-full overflow-hidden rounded-2xl bg-black">
        <div ref={containerRef} className="absolute inset-0" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center text-sm text-white">
            <div>
              <div className="mb-2 font-semibold">Camera error</div>
              <div className="opacity-80">{error}</div>
            </div>
          </div>
        )}
        {!error && (
          <>
            <div className="pointer-events-none absolute inset-x-3 top-3 rounded-2xl bg-black/70 px-3 py-2 text-white backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] opacity-80">
                  <ScanLine className="h-3.5 w-3.5" /> Scanning shelf…
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    found > 0 ? "bg-emerald-500 text-white" : "bg-white/15 text-white"
                  }`}
                >
                  {found} of {total} from your list
                </span>
              </div>
              {found > 0 && (
                <div className="mt-1 truncate text-[11px] text-emerald-300">
                  Found: {pickGroups.filter((g) => spotted.has(g.product_id)).map((g) => g.name).join(" · ")}
                </div>
              )}
            </div>
            {lastSeen && (
              <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl bg-black/70 px-3 py-2 text-[11px] text-white backdrop-blur">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {lastSeen.name && (
                      <div className="truncate text-[12px] font-semibold">{lastSeen.name}</div>
                    )}
                    <div className="truncate font-mono opacity-70">{lastSeen.code}</div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      lastSeen.status === "pick"
                        ? "bg-emerald-500 text-white"
                        : lastSeen.status === "catalog"
                        ? "bg-amber-500 text-white"
                        : "bg-slate-500 text-white"
                    }`}
                  >
                    {lastSeen.status === "pick"
                      ? "On your list"
                      : lastSeen.status === "catalog"
                      ? "In catalog"
                      : "Unknown code"}
                  </span>
                </div>
                {found > 0 && (
                  <div className="mt-1 text-[11px] font-semibold text-emerald-300">
                    {found} item{found === 1 ? "" : "s"} from your list found
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Your checklist
        </div>
        {total === 0 && (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No picks yet — shortlist products first.
          </div>
        )}
        <ul className="space-y-2">
          {pickGroups.map((g) => {
            const isFound = spotted.has(g.product_id);
            return (
              <li
                key={g.product_id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  isFound
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-border bg-card"
                }`}
              >
                {isFound ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{g.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {g.brand} · Zone {g.zone} · Aisle {g.aisle}
                  </div>
                </div>
                {isFound && (
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                    On shelf
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <Link
          to="/store/$tripId"
          params={{ tripId }}
          className="mt-4 block rounded-xl border border-border p-3 text-center text-sm font-semibold"
        >
          Back to store hub
        </Link>
      </div>
    </AppShell>
  );
}
