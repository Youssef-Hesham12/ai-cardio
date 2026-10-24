import { createFileRoute } from "@tanstack/react-router";
import Notifications from "@/features/notifications/Notifications";
export const Route = createFileRoute("/_authenticated/notifications")({
  component: Notifications,
});
