import { createFileRoute } from "@tanstack/react-router";
import History from "@/features/history/History";
export const Route = createFileRoute(
  "/_authenticated/patients/$patientId/history",
)({ component: History });
