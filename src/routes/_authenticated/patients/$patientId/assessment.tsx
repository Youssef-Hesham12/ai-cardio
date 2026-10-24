import { createFileRoute } from "@tanstack/react-router";
import AssessmentForm from "@/features/assessments/AssessmentForm";
export const Route = createFileRoute(
  "/_authenticated/patients/$patientId/assessment",
)({ component: AssessmentForm });
