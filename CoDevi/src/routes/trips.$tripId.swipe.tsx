import { AppShell } from "@/components/AppShell";
import { ProductHero, specChips } from "@/components/ProductCard";
import { groupByProductId, useProducts } from "@/lib/products";
import { useTrip, updateTrip } from "@/lib/trip-store";
import { generatePackingList } from "@/lib/ai.functions";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/trips/$tripId/swipe")({
  head: () => ({ meta: [{ title: "Swipe — TrailMate" }] }),
  component: SwipePage,
});

function SwipePage() {
  const { tripId } = useParams({ from: "/trips/$tripId/swipe" });
  const trip = useTrip(tripId);
  const products = useProducts();
  const groups = useMemo(() => (products.data ? groupByProductId(products.data) : new Map()), [products.data]);

  const queue = useMemo(() => {
    if (!trip?.recommendations) return [];
    const seen = new Set([...(trip.picks ?? []), ...(trip.skipped ?? [])]);
    return trip.recommendations
      .filter((r) => !seen.has(r.product_id))
      .map((r) => ({ rec: r, group: groups.get(r.product_id) }))
      .filter((x) => x.group);
  }, [trip, groups]);

  const [idx, setIdx] = useState(0);
  const current = queue[idx];
  const next = queue[idx + 1];

  function decide(keep: boolean) {
    if (!trip || !current) return;
    const picks = new Set(trip.picks ?? []);
    const skipped = new Set(trip.skipped ?? []);
    if (keep) picks.add(current.rec.product_id);
    else skipped.add(current.rec.product_id);
    updateTrip(tripId, { picks: [...picks], skipped: [...skipped] });
    setIdx((i) => i + 1);
  }

  const done = !current && (trip?.recommendations?.length ?? 0) > 0;

  const genFn = useServerFn(generatePackingList);
  const [packingStatus, setPackingStatus] = useState<"idle" | "building" | "ready" | "error">("idle");
  const triggered = useRef(false);

  useEffect(() => {
    if (!done || !trip || triggered.current) return;
    if (trip.packing) { setPackingStatus("ready"); return; }
    if ((trip.picks?.length ?? 0) === 0) return;
    triggered.current = true;
    setPackingStatus("building");
    const pickedGroups = (trip.picks ?? []).map((pid) => groups.get(pid)).filter(Boolean) as any[];
    const items = pickedGroups.map((g) => ({ product_id: g.product_id, name: g.name, category: g.category }));
    const { name, country, month, weather, gender, height_cm, weight_kg, sizing_notes, style, days, activities, budget_chf, notes } = trip;
    genFn({ data: { trip: { name, country, month, weather, gender, height_cm, weight_kg, sizing_notes, style, days, activities, budget_chf, notes }, items } })
      .then((out) => { updateTrip(tripId, { packing: out }); setPackingStatus("ready"); })
      .catch((e) => { setPackingStatus("error"); toast.error(String(e instanceof Error ? e.message : e)); triggered.current = false; });
  }, [done, trip, groups, genFn, tripId]);

  return (
    <AppShell title="Your matches" back={`/trips/${tripId}/`}>
      {done ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mb-2 text-5xl">🏔️</div>
          <div className="font-display mb-2 text-2xl">Saved for the store.</div>
          <div className="mb-5 text-sm text-muted-foreground">
            You matched with {trip?.picks?.length ?? 0} pieces of gear. We'll greet you with
            the list and an aisle-by-aisle route the moment you arrive.
          </div>
          <div className="mb-5 rounded-2xl border border-border bg-muted/40 p-4 text-left text-sm">
            {packingStatus === "building" && (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Building your packing list…</div>
            )}
            {packingStatus === "ready" && (
              <Link to="/trips/$tripId/packing" params={{ tripId }} className="flex items-center justify-between gap-2 font-semibold text-primary">
                <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Packing list ready</span>
                <span>View →</span>
              </Link>
            )}
            {packingStatus === "error" && (
              <button onClick={() => { triggered.current = false; setPackingStatus("idle"); }} className="text-sm font-semibold text-primary">
                Retry packing list
              </button>
            )}
            {packingStatus === "idle" && (trip?.picks?.length ?? 0) === 0 && (
              <div className="text-muted-foreground">No matches saved — nothing to pack.</div>
            )}
          </div>
          <Link
            to="/"
            className="inline-block rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
          >
            Done — see you at the store
          </Link>
          <Link
            to="/store/$tripId"
            params={{ tripId }}
            className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-primary"
          >
            <MapPin className="h-4 w-4" /> I'm already in the store
          </Link>
        </div>
      ) : !current ? (
        <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No matches yet — generate them from your trip first.
        </div>
      ) : (
        <>
          <div className="relative mx-auto h-[68vh] max-h-[640px] w-full">
            {next && <Card key={next.rec.product_id} group={next.group} reason={next.rec.reason} stacked />}
            <SwipeCard
              key={current.rec.product_id}
              group={current.group}
              reason={current.rec.reason}
              onDecide={decide}
            />
          </div>
          <div className="mt-6 flex items-center justify-center gap-6">
            <button
              className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card text-2xl shadow"
              onClick={() => decide(false)}
              aria-label="Skip"
            >
              😕
            </button>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {idx + 1} / {queue.length}
            </div>
            <button
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl shadow-lg"
              onClick={() => decide(true)}
              aria-label="Match"
            >
              ❤️
            </button>
          </div>
        </>
      )}
    </AppShell>
  );
}


function Card({
  group,
  reason,
  stacked,
}: {
  group: any;
  reason: string;
  stacked?: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 rounded-3xl border border-border bg-card shadow-xl ${
        stacked ? "scale-95 opacity-60" : ""
      }`}
    >
      <CardBody group={group} reason={reason} />
    </div>
  );
}

function CardBody({ group, reason }: { group: any; reason: string }) {
  const chips = specChips(group);
  return (
    <div className="flex h-full flex-col">
      <ProductHero group={group} className="rounded-b-none rounded-t-3xl" />
      <div className="flex-1 overflow-auto p-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{group.brand}</div>
        <div className="font-display text-2xl leading-tight">{group.name}</div>
        <div className="mt-1 text-sm font-semibold text-primary">CHF {group.price_chf}</div>
        <div className="mt-3 rounded-xl bg-secondary/10 p-3 text-xs italic text-foreground/80">
          "{reason}"
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {chips.map((c) => (
            <span key={c} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{c}</span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{group.description}</p>
      </div>
    </div>
  );
}

function SwipeCard({
  group,
  reason,
  onDecide,
}: {
  group: any;
  reason: string;
  onDecide: (keep: boolean) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const nopeOpacity = useTransform(x, [-140, -40], [1, 0]);

  function onEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > 120) onDecide(true);
    else if (info.offset.x < -120) onDecide(false);
  }

  return (
    <motion.div
      className="absolute inset-0 rounded-3xl border border-border bg-card shadow-xl"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={onEnd}
      whileTap={{ cursor: "grabbing" }}
    >
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute left-4 top-4 z-10 rounded-md border-4 border-primary px-3 py-1 text-xl font-extrabold text-primary"
      >
        MATCH
      </motion.div>
      <motion.div
        style={{ opacity: nopeOpacity }}
        className="absolute right-4 top-4 z-10 rounded-md border-4 border-muted-foreground px-3 py-1 text-xl font-extrabold text-muted-foreground"
      >
        PASS
      </motion.div>
      <CardBody group={group} reason={reason} />
    </motion.div>
  );
}
