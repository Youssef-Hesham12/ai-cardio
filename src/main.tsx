import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";
import "./index.css";
import { ToastProvider } from "./components/shared";

// Create a new router instance
const router = createRouter({
  routeTree,
  defaultPendingMs: 100,
  defaultPendingMinMs: 200,
  context: {
    auth: undefined!, // We'll set this in the App component
  },
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
}

// Render the app
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </StrictMode>,
  );
}
