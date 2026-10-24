import { createFileRoute } from "@tanstack/react-router";
import Patients from "@/features/patients/Patients";
export const Route = createFileRoute("/_authenticated/patients/")({
  component: Patients,
  validateSearch: (
    search: Record<string, unknown>,
  ): { risk?: string; status?: string } => ({
    risk: typeof search.risk === "string" ? search.risk : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
  }),
});
