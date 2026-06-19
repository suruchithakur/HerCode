import { AppShell } from "@/components/AppShell";
import { groupByProductId, useProducts } from "@/lib/products";
import { useTrip, useTripStatus, updateTrip } from "@/lib/trip-store";
import { generateChecklist } from "@/lib/ai.functions";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Heart, ListChecks, MapPin, Pencil, ScanLine, Sparkles } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/trips/$tripId/")({
  head: () => ({ meta: [{ title: "Trip — TrailMate" }] }),
  component: TripDashboard,
});

function TripDashboard() {
  const { tripId } = useParams({ from: "/trips/$tripId/" });
  const trip = useTrip(tripId);
  const status = useTripStatus(tripId);
  const products = useProducts();
  const fn = useServerFn(generateChecklist);

  if (typeof window !== "undefined") {
    console.log("[TripDashboard]", { tripId, status, hasTrip: !!trip });
  }

  const gen = useMutation({
    mutationFn: async () => {
      if (!trip || !products.data) throw new Error("Not ready");
      const groups = Array.from(groupByProductId(products.data).values());
      const catalog = groups.map((g) => ({
        product_id: g.product_id,
        name: g.name,
        brand: g.brand,
        category: g.category,
        price_chf: g.price_chf,
        tags: g.tags,
        waterproof_rating_mm: g.waterproof_rating_mm,
        temp_rating_c: g.temp_rating_c,
        weight_g: g.weight_g,
        material: g.material,
        zone_name: g.zone_name,
      }));
      const { name, country, month, weather, gender, height_cm, weight_kg, sizing_notes, style, days, activities, budget_chf, notes } = trip;
      return await fn({
        data: {
          trip: { name, country, month, weather, gender, height_cm, weight_kg, sizing_notes, style, days, activities, budget_chf, notes },
          catalog,
        },
      });
    },
    onSuccess: (out) => {
      updateTrip(tripId, { recommendations: out.picks, picks: trip?.picks ?? [], skipped: trip?.skipped ?? [] });
      toast.success(`Got ${out.picks.length} recommendations`);
    },
    onError: (e) => toast.error(String(e instanceof Error ? e.message : e)),
  });

  if (status === "loading") {
    return <AppShell title="Trip" back="/">Loading…</AppShell>;
  }
  if (status === "missing" || !trip) {
    return (
      <AppShell title="Trip not found" back="/">
        <div className="rounded-3xl border border-dashed border-border p-8 text-center">
          <div className="font-display mb-2 text-2xl">We couldn't find that trip.</div>
          <div className="mb-4 text-sm text-muted-foreground">
            It may have been removed from this device.
          </div>
          <Link to="/" className="inline-block rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
            Plan a new trip
          </Link>
        </div>
      </AppShell>
    );
  }


  const picksCount = trip.picks?.length ?? 0;
  const recCount = trip.recommendations?.length ?? 0;

  return (
    <AppShell title={trip.name || "Trip"} back="/">
      <Link
        to="/trips/$tripId/edit"
        params={{ tripId }}
        className="relative mb-5 block overflow-hidden rounded-3xl bg-gradient-to-br from-secondary to-secondary/80 p-6 text-secondary-foreground shadow-xl transition hover:opacity-95"
      >
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">
          {trip.country} · {trip.month} · {trip.days} days
        </div>
        <div className="font-display mt-2 text-3xl leading-tight">
          {trip.name || "Your match plan"}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {trip.activities?.map((a) => (
            <span key={a} className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] uppercase">
              {a}
            </span>
          ))}
        </div>
        <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur">
          <Pencil className="h-3.5 w-3.5" />
        </div>
      </Link>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="Cards" value={recCount} />
        <Stat label="Matches" value={picksCount} />
      </div>

      <div className="space-y-3">
        {recCount === 0 && (
          <Link
            to="/trips/$tripId/preparing"
            params={{ tripId }}
            className="flex w-full items-center justify-between rounded-2xl bg-primary p-5 text-left text-primary-foreground shadow-lg"
          >
            <div>
              <div className="font-semibold">Preparing your matches…</div>
              <div className="text-xs opacity-80">Tap to resume from {products.data?.length ?? "…"} pieces of gear</div>
            </div>
            <Sparkles className="h-6 w-6" />
          </Link>
        )}

        {recCount > 0 && (
          <Action
            to="/trips/$tripId/swipe"
            params={{ tripId }}
            icon={<Heart className="h-5 w-5 fill-current" />}
            title="Swipe your matches"
            subtitle={`${recCount} cards · keep what you love`}
            primary
          />
        )}

        {picksCount > 0 && (
          <Action
            to="/trips/$tripId/packing"
            params={{ tripId }}
            icon={<ListChecks className="h-5 w-5" />}
            title="Packing list & sizes"
            subtitle="AI groups & checks store stock"
          />
        )}

        {recCount > 0 && (
          <>
            <Action
              to="/store/$tripId"
              params={{ tripId }}
              icon={<MapPin className="h-5 w-5" />}
              title="I'm at the store"
              subtitle={picksCount > 0 ? "Guided route through the aisles" : "Preview the route from your recommendations"}
            />
            <Action
              to="/store/$tripId/scan"
              params={{ tripId }}
              icon={<ScanLine className="h-5 w-5" />}
              title="Scan a product"
              subtitle="Confirm or chat about it"
            />
          </>
        )}

        {recCount > 0 && (
          <button
            onClick={() => gen.mutate()}
            disabled={gen.isPending}
            className="w-full rounded-xl border border-border p-3 text-sm text-muted-foreground"
          >
            {gen.isPending ? "Re-curating…" : "Re-generate matches"}
          </button>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="font-display mt-1 text-3xl">{value}</div>
    </div>
  );
}

function Action({
  to,
  params,
  icon,
  title,
  subtitle,
  primary,
}: {
  to: string;
  params: Record<string, string>;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to as any}
      params={params as any}
      className={`flex items-center gap-4 rounded-2xl border p-4 shadow-sm transition hover:shadow ${
        primary
          ? "border-primary/30 bg-primary text-primary-foreground"
          : "border-border bg-card"
      }`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          primary ? "bg-white/20 text-primary-foreground" : "bg-secondary text-secondary-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className={`text-xs ${primary ? "opacity-80" : "text-muted-foreground"}`}>
          {subtitle}
        </div>
      </div>
      <CheckCircle2 className={`h-5 w-5 ${primary ? "opacity-70" : "text-primary opacity-0"}`} />
    </Link>
  );
}
