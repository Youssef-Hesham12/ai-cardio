import { createFileRoute } from "@tanstack/react-router";
import Requests from "@/features/requests/Requests";
export const Route = createFileRoute("/_authenticated/requests")({
  component: Requests,
});
