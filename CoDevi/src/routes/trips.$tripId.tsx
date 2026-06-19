import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/trips/$tripId")({
  component: () => <Outlet />,
});
