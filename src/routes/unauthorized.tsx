import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, Go } from "@/components/shared";
export const Route = createFileRoute("/unauthorized")({
  component: () => (
    <div className="login-page">
      <EmptyState
        title="Access unavailable"
        detail="Please sign in with your doctor account to continue."
        action={<Go to="/login">Sign in as doctor</Go>}
      />
    </div>
  ),
});
