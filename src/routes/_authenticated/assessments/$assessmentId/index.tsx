import { createFileRoute } from "@tanstack/react-router";
import AssessmentResult from "@/features/assessments/AssessmentResult";
export const Route = createFileRoute(
  "/_authenticated/assessments/$assessmentId/",
)({ component: AssessmentResult });
