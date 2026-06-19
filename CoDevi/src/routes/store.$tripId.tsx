import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/store/$tripId")({
  component: () => <Outlet />,
});
