import { createFileRoute } from "@tanstack/react-router";
import Messages from "@/features/messages/Messages";

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: (search: Record<string, unknown>): { patient?: string } => ({
    patient: typeof search.patient === "string" ? search.patient : undefined,
  }),
  component: Messages,
});
