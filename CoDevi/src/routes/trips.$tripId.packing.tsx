import { AppShell } from "@/components/AppShell";
import { groupByProductId, useProducts } from "@/lib/products";
import { useTrip, updateTrip } from "@/lib/trip-store";
import { generatePackingList } from "@/lib/ai.functions";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/trips/$tripId/packing")({
  head: () => ({ meta: [{ title: "Packing — TrailMate" }] }),
  component: Packing,
});

function Packing() {
  const { tripId } = useParams({ from: "/trips/$tripId/packing" });
  const trip = useTrip(tripId);
  const products = useProducts();
  const fn = useServerFn(generatePackingList);

  const groups = useMemo(() => (products.data ? groupByProductId(products.data) : new Map()), [products.data]);
  const pickedGroups = useMemo(
    () => (trip?.picks ?? []).map((pid) => groups.get(pid)).filter(Boolean) as any[],
    [trip, groups]
  );

  const gen = useMutation({
    mutationFn: async () => {
      if (!trip) throw new Error("No trip");
      const items = pickedGroups.map((g) => ({ product_id: g.product_id, name: g.name, category: g.category }));
      const { name, country, month, weather, gender, height_cm, weight_kg, sizing_notes, style, days, activities, budget_chf, notes } = trip;
      return await fn({
        data: {
          trip: { name, country, month, weather, gender, height_cm, weight_kg, sizing_notes, style, days, activities, budget_chf, notes },
          items,
        },
      });
    },
    onSuccess: (out) => {
      updateTrip(tripId, { packing: out });
      toast.success("Packing list ready");
    },
    onError: (e) => toast.error(String(e instanceof Error ? e.message : e)),
  });

  if (!trip) return <AppShell title="Packing" back="/trips">Loading…</AppShell>;

  return (
    <AppShell title="Packing list" back={`/trips/${tripId}`}>
      {!trip.packing ? (
        <button
          className="flex w-full items-center justify-between rounded-2xl bg-indigo-600 p-5 text-left text-white"
          onClick={() => gen.mutate()}
          disabled={gen.isPending || pickedGroups.length === 0}
        >
          <div>
            <div className="font-semibold">{gen.isPending ? "Building…" : "Generate packing list"}</div>
            <div className="text-xs opacity-80">{pickedGroups.length} picks</div>
          </div>
          <Sparkles className="h-6 w-6" />
        </button>
      ) : (
        <div className="space-y-5">
          {trip.packing.groups.map((g) => (
            <section key={g.title}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</h2>
              <ul className="space-y-2">
                {g.items.map((it) => {
                  const grp = groups.get(it.product_id);
                  if (!grp) return null;
                  const sizeCounts = new Map<string, number>();
                  for (const v of grp.variants as any[]) {
                    if (v.stock_total > 0) sizeCounts.set(v.size, (sizeCounts.get(v.size) ?? 0) + v.stock_total);
                  }
                  const inStockSizes = Array.from(sizeCounts.entries());
                  return (
                    <li key={it.product_id} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold">{grp.name}</div>
                          <div className="text-[11px] text-muted-foreground">{grp.brand} · CHF {grp.price_chf}</div>
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{grp.zone_name}</div>
                      </div>
                      {it.note && <div className="mt-1 text-xs italic text-muted-foreground">{it.note}</div>}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {inStockSizes.length > 0 ? (
                          inStockSizes.map(([s, qty]) => (
                            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> {s}
                              <span className="opacity-70">×{qty}</span>
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-600">
                            <AlertCircle className="h-3 w-3" /> Out of stock
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <button
            onClick={() => gen.mutate()}
            disabled={gen.isPending}
            className="w-full rounded-xl border border-border p-3 text-sm text-muted-foreground"
          >
            {gen.isPending ? "Re-building…" : "Re-generate packing list"}
          </button>
        </div>
      )}
    </AppShell>
  );
}
