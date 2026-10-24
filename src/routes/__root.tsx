import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { LoadingState, EmptyState } from "@/components/shared";
import Notfound from "../pages/Notfound";
import type { AuthContextType } from "@/context/AuthContext";

interface MyRouterContext {
  auth: AuthContextType;
}

const RootLayout = () => (
  <>
    <Outlet />
    {/* <TanStackRouterDevtools /> */}
  </>
);

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootLayout,
  notFoundComponent: Notfound,
  pendingComponent: LoadingState,
  errorComponent: ({ error, reset }) => (
    <EmptyState
      title="Unable to load this page"
      detail={error instanceof Error ? error.message : "A request failed."}
      action={<button onClick={reset}>Try again</button>}
    />
  ),
});
