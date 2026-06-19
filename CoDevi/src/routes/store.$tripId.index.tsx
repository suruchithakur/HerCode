import { AppShell } from "@/components/AppShell";
import { useTrip } from "@/lib/trip-store";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { MapPin, Navigation, ScanLine } from "lucide-react";
import { useState, type ReactNode } from "react";

export const Route = createFileRoute("/store/$tripId/")({
  head: () => ({ meta: [{ title: "In store — TrailMate" }] }),
  component: StoreHub,
});

const STORE = { name: "TrailMate Flagship · Zürich", lat: 47.3769, lng: 8.5417 };

function StoreHub() {
  const { tripId } = useParams({ from: "/store/$tripId/" });
  const navigate = useNavigate();
  const trip = useTrip(tripId);
  const [status, setStatus] = useState<"idle" | "checking" | "verified" | "denied">("idle");
  const [distance, setDistance] = useState<number | null>(null);

  function check() {
    setStatus("checking");
    if (!navigator.geolocation) return setStatus("denied");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const d = haversine(pos.coords.latitude, pos.coords.longitude, STORE.lat, STORE.lng);
        setDistance(d);
        setStatus("verified");
      },
      () => setStatus("denied"),
      { timeout: 8000 }
    );
  }

  return (
    <AppShell title="In store" back={`/trips/${tripId}`}>
      <div className="mb-4 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 p-5 text-white">
        <div className="text-xs uppercase tracking-wider opacity-80">Selected store</div>
        <div className="mt-1 text-lg font-semibold">{STORE.name}</div>
        <div className="mt-1 text-xs opacity-80">Trip: {trip?.name}</div>
      </div>

      {status !== "verified" && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 font-semibold">Are you at the store?</div>
          <p className="mb-4 text-xs text-muted-foreground">
            Optional — confirm your location for a distance check. You can use the route map either way.
          </p>
          <div className="flex gap-2">
            <button
              onClick={check}
              className="flex-1 rounded-xl bg-emerald-600 p-3 text-sm font-semibold text-white"
              disabled={status === "checking"}
            >
              {status === "checking" ? "Checking…" : "Check my location"}
            </button>
            <button
              onClick={() => {
                setStatus("verified");
                navigate({ to: "/store/$tripId/nav", params: { tripId } });
              }}
              className="flex-1 rounded-xl border border-border p-3 text-sm text-muted-foreground"
            >
              Skip
            </button>
          </div>
          {status === "denied" && (
            <div className="mt-3 text-xs text-rose-600">Couldn't read location. Tiles below still work.</div>
          )}
        </div>
      )}

      {status === "verified" && distance !== null && (
        <div className="mb-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
          You're {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`} from the store.
        </div>
      )}

      <div className="space-y-3">
        <Tile
          to="/store/$tripId/nav"
          params={{ tripId }}
          color="bg-sky-600"
          icon={<Navigation className="h-5 w-5" />}
          title="Guided route"
          subtitle="Optimized path through your picks"
        />
        <Tile
          to="/store/$tripId/scan"
          params={{ tripId }}
          color="bg-slate-700"
          icon={<ScanLine className="h-5 w-5" />}
          title="Scan a product"
          subtitle="Confirm or ask about anything you pick up"
        />
        <Tile
          to="/store/$tripId/ar"
          params={{ tripId }}
          color="bg-emerald-600"
          icon={<MapPin className="h-5 w-5" />}
          title="AR shelf highlight"
          subtitle="MatrixScan AR: green = on your list"
        />
      </div>
    </AppShell>
  );
}

function Tile({
  to,
  params,
  color,
  icon,
  title,
  subtitle,
}: {
  to: string;
  params: Record<string, string>;
  color: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to as any}
      params={params as any}
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${color}`}>{icon}</div>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </Link>
  );
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}