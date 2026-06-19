import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useTrip, updateTrip } from "@/lib/trip-store";
import type { Trip } from "@/lib/types";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { Save, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/trips/$tripId/edit")({
  head: () => ({ meta: [{ title: "Edit trip — TrailMate" }] }),
  component: EditTrip,
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ACTIVITIES = ["hike", "ski", "climb", "camp", "trail-run", "swim", "via-ferrata", "bikepack"];

function EditTrip() {
  const { tripId } = useParams({ from: "/trips/$tripId/edit" });
  const trip = useTrip(tripId);
  const navigate = useNavigate();

  if (!trip) {
    return (
      <AppShell title="Edit trip" back={`/trips/${tripId}`}>
        <div className="text-center text-sm text-muted-foreground">Trip not found.</div>
      </AppShell>
    );
  }

  return <EditForm trip={trip} onCancel={() => navigate({ to: "/trips/$tripId", params: { tripId } })} />;
}

function EditForm({ trip, onCancel }: { trip: Trip; onCancel: () => void }) {
  const [name, setName] = useState(trip.name);
  const [country, setCountry] = useState(trip.country);
  const [month, setMonth] = useState(trip.month);
  const [weather, setWeather] = useState(trip.weather);
  const [days, setDays] = useState(trip.days);
  const [gender, setGender] = useState(trip.gender);
  const [heightCm, setHeightCm] = useState(trip.height_cm);
  const [weightKg, setWeightKg] = useState(trip.weight_kg);
  const [sizingNotes, setSizingNotes] = useState(trip.sizing_notes);
  const [style, setStyle] = useState(trip.style);
  const [budget, setBudget] = useState(trip.budget_chf);
  const [notes, setNotes] = useState(trip.notes);
  const [activities, setActivities] = useState<string[]>(trip.activities ?? []);

  const toggleAct = (a: string) => {
    setActivities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const save = () => {
    updateTrip(trip.id, {
      name,
      country,
      month,
      weather,
      days,
      gender,
      height_cm: heightCm,
      weight_kg: weightKg,
      sizing_notes: sizingNotes,
      style,
      budget_chf: budget,
      notes,
      activities,
    });
    toast.success("Trip updated");
    onCancel();
  };

  const hasChanges =
    name !== trip.name ||
    country !== trip.country ||
    month !== trip.month ||
    weather !== trip.weather ||
    days !== trip.days ||
    gender !== trip.gender ||
    heightCm !== trip.height_cm ||
    weightKg !== trip.weight_kg ||
    sizingNotes !== trip.sizing_notes ||
    style !== trip.style ||
    budget !== trip.budget_chf ||
    notes !== trip.notes ||
    activities.length !== (trip.activities?.length ?? 0) ||
    !activities.every((a) => trip.activities?.includes(a));

  return (
    <AppShell title="Edit trip" back={`/trips/${trip.id}`}>
      <div className="space-y-6">
        <Section title="Trip basics">
          <Field label="Trip name">
            <TextInput value={name} onChange={setName} placeholder="Weekend in Zermatt" />
          </Field>
          <Field label="Country">
            <TextInput value={country} onChange={setCountry} />
          </Field>
          <Field label="Month">
            <div className="grid grid-cols-4 gap-2">
              {MONTHS.map((m) => (
                <Chip key={m} active={month === m} onClick={() => setMonth(m)}>
                  {m}
                </Chip>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Days">
              <TextInput value={days} onChange={setDays} type="number" inputMode="numeric" />
            </Field>
            <Field label="Weather">
              <TextInput value={weather} onChange={setWeather} placeholder="Cold, snow" />
            </Field>
          </div>
        </Section>

        <Section title="About you">
          <Field label="Fit">
            <div className="grid grid-cols-3 gap-2">
              {["women", "men", "unisex"].map((g) => (
                <Chip key={g} active={gender === g} onClick={() => setGender(g)}>
                  {g}
                </Chip>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Height (cm)">
              <TextInput value={heightCm} onChange={setHeightCm} type="number" inputMode="numeric" />
            </Field>
            <Field label="Weight (kg)">
              <TextInput value={weightKg} onChange={setWeightKg} type="number" inputMode="numeric" />
            </Field>
          </div>
          <Field label="Sizes you already know">
            <Textarea
              value={sizingNotes}
              onChange={setSizingNotes}
              placeholder="Patagonia M jackets, Salomon EU42 shoes…"
            />
          </Field>
        </Section>

        <Section title="Style & budget">
          <Field label="Style & colour">
            <TextInput value={style} onChange={setStyle} placeholder="Earth tones, minimalist" />
          </Field>
          <Field label="Budget (CHF)">
            <TextInput value={budget} onChange={setBudget} type="number" inputMode="numeric" placeholder="500" />
          </Field>
          <Field label="Anything else?">
            <Textarea value={notes} onChange={setNotes} placeholder="Vegan materials, packing light, kids along…" />
          </Field>
        </Section>

        <Section title="Activities">
          <div className="flex flex-wrap gap-2">
            {ACTIVITIES.map((a) => (
              <Chip key={a} active={activities.includes(a)} onClick={() => toggleAct(a)}>
                {a}
              </Chip>
            ))}
          </div>
        </Section>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 bg-gradient-to-t from-background via-background to-transparent px-4 pb-4 pt-6">
        <button
          onClick={save}
          disabled={!hasChanges}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground shadow-lg transition disabled:opacity-40"
        >
          <Save className="h-4 w-4" /> Save changes
        </button>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:bg-accent";

function TextInput({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
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
    <textarea {...rest} rows={3} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
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
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-card-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}
