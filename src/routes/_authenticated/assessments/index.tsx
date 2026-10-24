import { createFileRoute } from "@tanstack/react-router";
import Assessments from "@/features/assessments/Assessments";
export const Route = createFileRoute("/_authenticated/assessments/")({
  component: Assessments,
  validateSearch: (
    search: Record<string, unknown>,
  ): { risk?: string; status?: string } => ({
    risk: typeof search.risk === "string" ? search.risk : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
  }),
});
