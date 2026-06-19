import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/trips/new")({
  component: () => <Navigate to="/" replace />,
});
