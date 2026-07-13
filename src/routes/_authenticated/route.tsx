import { createFileRoute, Outlet } from "@tanstack/react-router";

// Auth gate removed for demo — the intelligence hub is open to any viewer
// so we can focus on the collection → verification → visualization loop.
export const Route = createFileRoute("/_authenticated")({
  component: () => <Outlet />,
});
