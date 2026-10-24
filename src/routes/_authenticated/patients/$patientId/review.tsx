import { createFileRoute } from "@tanstack/react-router";
import PatientReview from "@/features/reviews/PatientReview";
export const Route = createFileRoute(
  "/_authenticated/patients/$patientId/review",
)({ component: PatientReview });
