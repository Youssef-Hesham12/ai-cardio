import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/features/dashboard/Dashboard";
import { getPatients } from "@/data/store";
export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  loader: getPatients,
});
