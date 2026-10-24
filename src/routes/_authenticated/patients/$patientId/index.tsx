import { createFileRoute } from "@tanstack/react-router";
import PatientProfile from "@/features/patients/PatientProfile";
export const Route = createFileRoute("/_authenticated/patients/$patientId/")({
  component: PatientProfile,
});
