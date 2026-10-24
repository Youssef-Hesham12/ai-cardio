import { createFileRoute } from "@tanstack/react-router";
import Simulator from "@/features/simulator/Simulator";
export const Route = createFileRoute(
  "/_authenticated/assessments/$assessmentId/simulator",
)({ component: Simulator });
