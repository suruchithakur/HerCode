import { AppShell } from "@/components/AppShell";
import { useTrips, deleteTrip } from "@/lib/trip-store";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, MapPin, Calendar, Trash2 } from "lucide-react";

export const Route = createFileRoute("/trips/")({
  head: () => ({ meta: [{ title: "Your trips — TrailMate" }] }),
  component: TripsPage,
});

function TripsPage() {
  const trips = useTrips();
  return (
    <AppShell title="Your trips" back="/">
      <Link
        to="/trips/new"
        className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 p-4 font-semibold text-white shadow-sm transition hover:bg-emerald-700"
      >
        <Plus className="h-5 w-5" /> New trip
      </Link>

      {trips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No trips yet. Tap "New trip" to start planning.
        </div>
      ) : (
        <ul className="space-y-3">
          {trips.map((t) => (
            <li
              key={t.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <Link to="/trips/$tripId" params={{ tripId: t.id }} className="block">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{t.name || "Untitled trip"}</h3>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {t.country && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {t.country}
                        </span>
                      )}
                      {t.month && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {t.month}
                        </span>
                      )}
                      {t.days && <span>{t.days} days</span>}
                    </div>
                    {t.activities?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.activities.slice(0, 4).map((a) => (
                          <span
                            key={a}
                            className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-700"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {(t.picks?.length ?? 0)} picks
                  </div>
                </div>
              </Link>
              <button
                onClick={() => {
                  if (confirm("Delete this trip?")) deleteTrip(t.id);
                }}
                className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
