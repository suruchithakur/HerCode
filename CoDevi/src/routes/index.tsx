import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Heart, Mountain, Sparkles } from "lucide-react";
import { listTrips, newTripId, saveTrip } from "@/lib/trip-store";
import type { Trip } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TrailMate — Find your perfect match for the mountains" },
      {
        name: "description",
        content:
          "TrailMate is your AI concierge for outdoor gear. Tell us about your trip, swipe the matches, and meet your gear in-store.",
      },
      { property: "og:title", content: "TrailMate — Find your perfect match" },
      {
        property: "og:description",
        content: "AI-powered gear matchmaking for Swiss outdoor adventures.",
      },
    ],
  }),
  component: Landing,
});

const ACTIVITIES = ["hike", "ski", "climb", "camp", "trail-run", "swim", "via-ferrata", "bikepack"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const emptyDraft: Omit<Trip, "id" | "createdAt"> = {
  name: "",
  country: "Switzerland",
  month: "",
  weather: "",
  gender: "",
  height_cm: "",
  weight_kg: "",
  sizing_notes: "",
  style: "",
  days: "",
  activities: [],
  budget_chf: "",
  notes: "",
};

function Landing() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<"welcome" | "wizard">("welcome");

  useEffect(() => {
    setTrips(listTrips());
    setHydrated(true);
    const refresh = () => setTrips(listTrips());
    window.addEventListener("trailmate:trips-changed", refresh);
    return () => window.removeEventListener("trailmate:trips-changed", refresh);
  }, []);

  // First-time users land straight in the wizard.
  useEffect(() => {
    if (hydrated && trips.length === 0) setMode("wizard");
  }, [hydrated, trips.length]);

  if (!hydrated) return <Shell><div className="h-screen" /></Shell>;

  return (
    <Shell>
      <AnimatePresence mode="wait">
        {mode === "welcome" && trips.length > 0 ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <WelcomeBack trips={trips} onStartNew={() => setMode("wizard")} />
          </motion.div>
        ) : (
          <motion.div
            key="wizard"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Wizard
              hasTrips={trips.length > 0}
              onCancel={() => setMode("welcome")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-secondary text-secondary-foreground">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),1rem)]">
        {children}
      </div>
    </div>
  );
}

/* ---------- Welcome back ---------- */

function WelcomeBack({ trips, onStartNew }: { trips: Trip[]; onStartNew: () => void }) {
  const last = trips[0];
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex items-center py-4">
        <div className="flex items-center gap-2">
          <Mountain className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold tracking-wide">TrailMate</span>
        </div>
      </header>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Welcome back</p>
        <h1 className="font-display mt-2 text-5xl leading-[0.95] text-secondary-foreground">
          Your last match
          <br />
          is waiting.
        </h1>
      </div>

      <Link
        to="/trips/$tripId"
        params={{ tripId: last.id }}
        className="mt-8 block overflow-hidden rounded-3xl bg-card text-card-foreground shadow-2xl"
      >
        <div className="bg-gradient-to-br from-primary to-primary/70 p-6 text-primary-foreground">
          <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">
            {last.country} · {last.month || "—"} · {last.days || "?"}d
          </div>
          <div className="font-display mt-2 text-3xl">{last.name || "Untitled trip"}</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(last.activities ?? []).slice(0, 4).map((a) => (
              <span key={a} className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] uppercase">
                {a}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <div className="text-xs text-muted-foreground">
            {last.picks?.length ?? 0} matches · {last.recommendations?.length ?? 0} cards
          </div>
          <div className="flex items-center gap-1 text-sm font-semibold text-primary">
            Resume <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </Link>

      <button
        onClick={onStartNew}
        className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-sm font-semibold text-secondary-foreground transition hover:bg-white/10"
      >
        <Sparkles className="h-4 w-4" /> Start a new match
      </button>

      {trips.length > 1 && (
        <div className="mt-8">
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-secondary-foreground/60">
            Earlier trips
          </p>
          <ul className="space-y-2">
            {trips.slice(1, 4).map((t) => (
              <li key={t.id}>
                <Link
                  to="/trips/$tripId"
                  params={{ tripId: t.id }}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm hover:bg-white/10"
                >
                  <span className="truncate">{t.name || "Untitled trip"}</span>
                  <span className="ml-3 shrink-0 text-xs text-secondary-foreground/60">
                    {t.country} · {t.month}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1" />
      <p className="py-6 text-center text-[10px] uppercase tracking-[0.25em] text-secondary-foreground/40">
        Scandit × HerCode
      </p>
    </div>
  );
}

/* ---------- Wizard ---------- */

const STEPS = ["Trip", "When & where", "About you", "Style & budget", "Activities"] as const;

function Wizard({ hasTrips, onCancel }: { hasTrips: boolean; onCancel: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [t, setT] = useState(emptyDraft);

  const set = <K extends keyof typeof t>(k: K, v: (typeof t)[K]) =>
    setT((p) => ({ ...p, [k]: v }));
  const toggleAct = (a: string) =>
    set(
      "activities",
      t.activities.includes(a) ? t.activities.filter((x) => x !== a) : [...t.activities, a],
    );

  const canNext = (() => {
    if (step === 0) return t.name.trim().length > 1;
    if (step === 1) return !!t.month && !!t.days;
    if (step === 4) return t.activities.length > 0;
    return true;
  })();

  function finish() {
    const trip: Trip = { ...t, id: newTripId(), createdAt: Date.now() };
    saveTrip(trip);
    navigate({ to: "/trips/$tripId/preparing", params: { tripId: trip.id } });
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex items-center justify-between py-4">
        <button
          onClick={() => (step === 0 ? (hasTrips ? onCancel() : null) : setStep(step - 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full text-secondary-foreground/80 hover:bg-white/10 disabled:opacity-30"
          disabled={step === 0 && !hasTrips}
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/60" : "w-3 bg-white/20"
              }`}
            />
          ))}
        </div>
        <span className="w-10 text-right text-xs text-secondary-foreground/60">
          {step + 1}/{STEPS.length}
        </span>
      </header>

      {step === 0 && (
        <Intro />
      )}

      <div className="mt-2 flex-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-primary/80">
          Step {step + 1} · {STEPS[step]}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="mt-3"
          >
            {step === 0 && (
              <>
                <Q>What should we call this match?</Q>
                <TextInput
                  autoFocus
                  placeholder="Weekend in Zermatt"
                  value={t.name}
                  onChange={(v) => set("name", v)}
                />
              </>
            )}
            {step === 1 && (
              <>
                <Q>When &amp; where?</Q>
                <Label>Country</Label>
                <TextInput value={t.country} onChange={(v) => set("country", v)} />
                <Label className="mt-5">Month</Label>
                <div className="grid grid-cols-4 gap-2">
                  {MONTHS.map((m) => (
                    <Chip key={m} active={t.month === m} onClick={() => set("month", m)}>
                      {m}
                    </Chip>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div>
                    <Label>Days</Label>
                    <TextInput
                      type="number"
                      inputMode="numeric"
                      value={t.days}
                      onChange={(v) => set("days", v)}
                    />
                  </div>
                  <div>
                    <Label>Weather</Label>
                    <TextInput
                      placeholder="Cold, snow"
                      value={t.weather}
                      onChange={(v) => set("weather", v)}
                    />
                  </div>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <Q>About you</Q>
                <Label>Fit</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["women", "men", "unisex"].map((g) => (
                    <Chip key={g} active={t.gender === g} onClick={() => set("gender", g)}>
                      {g}
                    </Chip>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div>
                    <Label>Height (cm)</Label>
                    <TextInput
                      type="number"
                      inputMode="numeric"
                      value={t.height_cm}
                      onChange={(v) => set("height_cm", v)}
                    />
                  </div>
                  <div>
                    <Label>Weight (kg)</Label>
                    <TextInput
                      type="number"
                      inputMode="numeric"
                      value={t.weight_kg}
                      onChange={(v) => set("weight_kg", v)}
                    />
                  </div>
                </div>
                <Label className="mt-5">Sizes you already know (optional)</Label>
                <Textarea
                  placeholder="Patagonia M jackets, Salomon EU42 shoes…"
                  value={t.sizing_notes}
                  onChange={(v) => set("sizing_notes", v)}
                />
              </>
            )}
            {step === 3 && (
              <>
                <Q>Style &amp; budget</Q>
                <Label>Style &amp; colour</Label>
                <TextInput
                  placeholder="Earth tones, minimalist"
                  value={t.style}
                  onChange={(v) => set("style", v)}
                />
                <Label className="mt-5">Budget (CHF)</Label>
                <TextInput
                  type="number"
                  inputMode="numeric"
                  placeholder="500"
                  value={t.budget_chf}
                  onChange={(v) => set("budget_chf", v)}
                />
                <Label className="mt-5">Anything else?</Label>
                <Textarea
                  placeholder="Vegan materials, packing light, kids along…"
                  value={t.notes}
                  onChange={(v) => set("notes", v)}
                />
              </>
            )}
            {step === 4 && (
              <>
                <Q>What are you doing out there?</Q>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITIES.map((a) => (
                    <Chip key={a} active={t.activities.includes(a)} onClick={() => toggleAct(a)}>
                      {a}
                    </Chip>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 -mx-5 mt-6 bg-gradient-to-t from-secondary via-secondary to-transparent px-5 pb-2 pt-6">
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => canNext && setStep(step + 1)}
            disabled={!canNext}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg transition disabled:opacity-40"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={!canNext}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg disabled:opacity-40"
          >
            <Heart className="h-4 w-4 fill-current" /> Find my match
          </button>
        )}
      </div>
    </div>
  );
}

function Intro() {
  return (
    <div className="mt-2">
      <h1 className="font-display text-5xl leading-[0.95] text-secondary-foreground">
        Find your perfect
        <br />
        <span className="text-primary">match</span> for the mountains.
      </h1>
      <p className="mt-4 max-w-xs text-sm text-secondary-foreground/70">
        Five quick questions. Then swipe AI-curated gear, try it on in-store, and walk out with what
        actually fits your trip.
      </p>
    </div>
  );
}

/* ---------- Form atoms ---------- */

function Q({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display mb-4 mt-2 text-3xl leading-tight text-secondary-foreground">
      {children}
    </h2>
  );
}

function Label({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <label
      className={`mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary-foreground/60 ${className}`}
    >
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-base text-secondary-foreground placeholder:text-secondary-foreground/40 outline-none transition focus:border-primary focus:bg-white/15";

function TextInput({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  );
}

function Textarea({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  return (
    <textarea
      {...rest}
      rows={3}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-sm capitalize transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-white/20 bg-white/5 text-secondary-foreground hover:border-primary/60"
      }`}
    >
      {children}
    </button>
  );
}

