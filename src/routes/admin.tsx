import {
  createFileRoute,
  redirect,
  Outlet,
  Navigate,
} from "@tanstack/react-router";
import {
  LayoutDashboard,
  ScrollText,
  Settings2,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import PortalShell, { type PortalNavItem } from "@/components/PortalShell";
import { useAuth } from "@/context/AuthContext";
import { useAdminData } from "@/data/accounts";
import "@/features/admin/admin.css";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) throw redirect({ to: "/login" });
    if (context.auth.session?.role !== "super_admin")
      throw redirect({ to: "/dashboard" });
  },
  component: AdminLayout,
});
function AdminLayout() {
  const auth = useAuth();
  const data = useAdminData();
  if (!auth.isAuthenticated) return <Navigate to="/login" />;
  if (auth.session?.role !== "super_admin") return <Navigate to="/dashboard" />;
  const links: PortalNavItem[] = [
    {
      to: "/admin",
      label: "Overview",
      icon: LayoutDashboard,
      group: "Administration",
    },
    {
      to: "/admin/doctors",
      label: "Doctors",
      icon: Stethoscope,
      count: data.doctors.length,
    },
    {
      to: "/admin/activity",
      label: "Activity Log",
      icon: ScrollText,
      group: "System",
    },
    { to: "/admin/settings", label: "System Settings", icon: Settings2 },
  ];
  return (
    <PortalShell
      title="Admin Console"
      brandLabel="SUPER ADMIN"
      home="/admin"
      links={links}
      profile={{
        name: data.administrator.name,
        detail: data.administrator.email,
      }}
      settings="/admin/settings"
      headerAction={
        <span className="admin-role">
          <ShieldCheck size={14} />
          <span>Super Admin</span>
        </span>
      }
    >
      <div className="admin-view">
        <Outlet />
      </div>
    </PortalShell>
  );
}
