import {
  createFileRoute,
  redirect,
  Outlet,
  Link,
  Navigate,
} from "@tanstack/react-router";
import {
  Bell,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  UserRoundPlus,
  Users,
} from "lucide-react";
import PortalShell, { type PortalNavItem } from "@/components/PortalShell";
import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/data/store";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) throw redirect({ to: "/login" });
    if (context.auth.session?.role !== "doctor")
      throw redirect({ to: "/admin" });
  },
  component: AuthenticatedLayout,
});
function AuthenticatedLayout() {
  const auth = useAuth();
  const data = useAppData();
  if (!auth.isAuthenticated) return <Navigate to="/login" />;
  if (auth.session?.role !== "doctor") return <Navigate to="/admin" />;
  const unread = data.notifications.filter((item) => !item.read).length;
  const unreadMessages = data.messages.filter(
    (message) =>
      message.sender === "Patient" &&
      !message.read &&
      data.patients.some((patient) => patient.id === message.patientId),
  ).length;
  const links: PortalNavItem[] = [
    {
      to: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      group: "Workspace",
    },
    { to: "/patients", label: "Patients", icon: Users },
    { to: "/assessments", label: "Assessments", icon: ClipboardCheck },
    {
      to: "/requests",
      label: "Patient Requests",
      icon: UserRoundPlus,
      group: "Management",
      count: data.requests.filter((item) => item.status === "Pending").length,
    },
    {
      to: "/messages",
      label: "Messages",
      icon: MessageSquare,
      count: unreadMessages,
    },
    { to: "/reports", label: "Reports", icon: FileText },
    { to: "/notifications", label: "Notifications", icon: Bell, count: unread },
    {
      to: "/settings",
      label: "Settings",
      icon: Settings,
      group: "Preferences",
    },
  ];
  return (
    <PortalShell
      title="Doctor Portal"
      brandLabel="DOCTOR PORTAL"
      home="/dashboard"
      links={links}
      profile={{ name: data.doctor.name, detail: data.doctor.specialty }}
      settings="/settings"
      headerAction={
        <Link
          to="/notifications"
          className="icon-button"
          title="Notifications"
          aria-label={`${unread} unread notifications`}
        >
          <Bell size={20} />
          {unread > 0 && <span className="notification-count">{unread}</span>}
        </Link>
      }
    >
      <Outlet />
    </PortalShell>
  );
}
