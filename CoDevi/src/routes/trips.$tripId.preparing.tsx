import { groupByProductId, useProducts } from "@/lib/products";
import { useTrip, useTripStatus, updateTrip } from "@/lib/trip-store";
import { generateChecklist } from "@/lib/ai.functions";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Sparkles, Thermometer, ClipboardList, Mountain } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/trips/$tripId/preparing")({
  head: () => ({ meta: [{ title: "Preparing your list — TrailMate" }] }),
  component: Preparing,
});

const STAGES = [
  { key: "climate", label: "Analyzing climate conditions…", Icon: Thermometer },
  { key: "restrictions", label: "Checking local restrictions…", Icon: ClipboardList },
  { key: "activities", label: "Loading activity requirements…", Icon: Mountain },
  { key: "checklist", label: "Generating your checklist…", Icon: Sparkles },
] as const;

const MIN_DURATION_MS = 3000;

function Preparing() {
  const { tripId } = useParams({ from: "/trips/$tripId/preparing" });
  const navigate = useNavigate();
  const trip = useTrip(tripId);
  const status = useTripStatus(tripId);
  const products = useProducts();
  const fn = useServerFn(generateChecklist);
  const [stageIdx, setStageIdx] = useState(0);
  const ranRef = useRef(false);
  const startedAtRef = useRef<number>(Date.now());

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
    },
    onError: (e) => toast.error(String(e instanceof Error ? e.message : e)),
  });

  // Fire AI once trip + catalog are ready
  useEffect(() => {
    if (ranRef.current) return;
    if (!trip || !products.data) return;
    ranRef.current = true;
    startedAtRef.current = Date.now();
    // If recommendations already exist, just skip ahead
    if ((trip.recommendations?.length ?? 0) > 0) return;
    gen.mutate();
  }, [trip, products.data, gen]);

  // Animate through the first 3 stages while the model runs
  useEffect(() => {
    if (stageIdx >= STAGES.length - 1) return;
    const t = setTimeout(() => setStageIdx((i) => Math.min(i + 1, STAGES.length - 1)), 900);
    return () => clearTimeout(t);
  }, [stageIdx]);

  // When AI finishes (or was already done), enforce minimum dwell then navigate
  useEffect(() => {
    const ready = (trip?.recommendations?.length ?? 0) > 0 || gen.isSuccess;
    if (!ready) return;
    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(MIN_DURATION_MS - elapsed, 400);
    const minDwell = setTimeout(() => {
      setStageIdx(STAGES.length); // mark all done
      const go = setTimeout(() => {
        navigate({ to: "/trips/$tripId/swipe", params: { tripId } });
      }, 650);
      return () => clearTimeout(go);
    }, remaining);
    return () => clearTimeout(minDwell);
  }, [trip?.recommendations, gen.isSuccess, navigate, tripId]);

  if (status === "missing") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-secondary p-6 text-secondary-foreground">
        <div className="text-center">
          <div className="font-display text-2xl">Trip not found</div>
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Plan a new trip
          </button>
        </div>
      </div>
    );
  }

  const subtitle = trip ? [trip.name, trip.country].filter(Boolean).join(" · ") : "";

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-start overflow-hidden bg-secondary px-6 pt-16 pb-10 text-secondary-foreground">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--terracotta), transparent 70%)" }}
      />

      {/* Halo orb */}
      <div className="relative z-10 mb-8 flex h-32 w-32 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary to-accent opacity-90 shadow-[0_0_60px_-5px_var(--terracotta)]" />
        <div className="absolute inset-3 rounded-full border border-white/15" />
        <Sparkles className="relative h-12 w-12 text-primary-foreground drop-shadow" />
      </div>

      <h1 className="font-display relative z-10 text-center text-3xl leading-tight">
        AI is preparing your list
      </h1>
      {subtitle && (
        <p className="relative z-10 mt-2 text-sm text-secondary-foreground/60">{subtitle}</p>
      )}

      <ul className="relative z-10 mt-10 w-full max-w-md space-y-3">
        {STAGES.map((s, i) => {
          const done = i < stageIdx || gen.isSuccess || (trip?.recommendations?.length ?? 0) > 0 && i < STAGES.length - 1;
          const active = i === stageIdx && !done;
          const isFinal = i === STAGES.length - 1;
          const finalDone = isFinal && stageIdx >= STAGES.length;
          return (
            <li
              key={s.key}
              className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 backdrop-blur-sm transition ${
                done || finalDone ? "opacity-100" : active ? "opacity-100" : "opacity-50"
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <s.Icon className="h-4 w-4 text-primary-foreground" />
              </span>
              <span className="flex-1 text-sm">{s.label}</span>
              {finalDone || done ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : active ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <span className="h-5 w-5 rounded-full border border-white/15" />
              )}
            </li>
          );
        })}
      </ul>

      {gen.isError && (
        <button
          onClick={() => gen.mutate()}
          className="relative z-10 mt-8 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          Try again
        </button>
      )}
    </div>
  );
}
