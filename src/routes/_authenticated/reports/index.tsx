import { createFileRoute } from "@tanstack/react-router";
import Assessments from "@/features/assessments/Assessments";
export const Route = createFileRoute("/_authenticated/reports/")({
  component: () => <Assessments reports />,
});
