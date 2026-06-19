import { useEffect, useState } from "react";
import type { Trip } from "./types";

const KEY = "trailmate:trips";

function read(): Record<string, Trip> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

function write(trips: Record<string, Trip>) {
  localStorage.setItem(KEY, JSON.stringify(trips));
  window.dispatchEvent(new Event("trailmate:trips-changed"));
}

export function listTrips(): Trip[] {
  return Object.values(read()).sort((a, b) => b.createdAt - a.createdAt);
}

export function getTrip(id: string): Trip | undefined {
  return read()[id];
}

export function saveTrip(trip: Trip) {
  const all = read();
  all[trip.id] = trip;
  write(all);
}

export function deleteTrip(id: string) {
  const all = read();
  delete all[id];
  write(all);
}

export function updateTrip(id: string, patch: Partial<Trip>) {
  const all = read();
  if (!all[id]) return;
  all[id] = { ...all[id], ...patch };
  write(all);
}

export function newTripId() {
  return "trip_" + Math.random().toString(36).slice(2, 10);
}

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  useEffect(() => {
    const refresh = () => setTrips(listTrips());
    refresh();
    window.addEventListener("trailmate:trips-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("trailmate:trips-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return trips;
}

export function useTrip(id: string | undefined): Trip | undefined {
  const [trip, setTrip] = useState<Trip | undefined>();
  useEffect(() => {
    if (!id) return;
    const refresh = () => setTrip(getTrip(id));
    refresh();
    window.addEventListener("trailmate:trips-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("trailmate:trips-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [id]);
  return trip;
}

export function useTripStatus(id: string | undefined): "loading" | "found" | "missing" {
  const [status, setStatus] = useState<"loading" | "found" | "missing">("loading");
  useEffect(() => {
    if (!id) {
      setStatus("missing");
      return;
    }
    const refresh = () => setStatus(getTrip(id) ? "found" : "missing");
    refresh();
    window.addEventListener("trailmate:trips-changed", refresh);
    return () => window.removeEventListener("trailmate:trips-changed", refresh);
  }, [id]);
  return status;
}


