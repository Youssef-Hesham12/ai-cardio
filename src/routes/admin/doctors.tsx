import { createFileRoute } from "@tanstack/react-router";
import AdminDoctors from "@/features/admin/AdminDoctors";
export const Route = createFileRoute("/admin/doctors")({
  validateSearch: (search: Record<string, unknown>): { create?: boolean } => ({
    create:
      search.create === true || search.create === "true" ? true : undefined,
  }),
  component: AdminDoctors,
});
