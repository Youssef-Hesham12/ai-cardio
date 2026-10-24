import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar, date } from "./shared";
import { useAuth } from "@/context/AuthContext";
import { useAppData, updateData } from "@/data/store";

export interface PortalNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  group?: string;
  count?: number;
}
interface Props {
  title: string;
  brandLabel: string;
  home: string;
  links: PortalNavItem[];
  profile: { name: string; detail: string };
  settings: string;
  children: ReactNode;
  headerAction?: ReactNode;
}
export default function PortalShell({
  title,
  brandLabel,
  home,
  links,
  profile,
  settings,
  children,
  headerAction,
}: Props) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const data = useAppData();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const active = (to: string) =>
    location.pathname === to ||
    (to !== home && location.pathname.startsWith(`${to}/`));
  const currentTitle =
    links.find((link) => active(link.to))?.label || links[0]?.label;
  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      data.preferences.theme === "dark",
    );
  }, [data.preferences.theme]);
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const menuButton = menuRef.current;
    const focusable = () =>
      Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>("a[href], button") ||
          [],
      ).filter(
        (element) =>
          getComputedStyle(element).visibility !== "hidden" &&
          element.getClientRects().length > 0,
      );
    focusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
      }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      menuButton?.focus({ preventScroll: true });
    };
  }, [mobileOpen]);
  return (
    <div
      className={`app-shell ${collapsed ? "collapsed" : ""} ${data.preferences.compact ? "compact" : ""}`}
    >
      {mobileOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Dismiss navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}
      >
        <Link to={home} className="brand">
          <span className="brand-mark">
            <HeartPulse size={26} />
          </span>
          <div>
            <div className="brand-name">
              CardioAssist <span>AI</span>
            </div>
            <small>{brandLabel}</small>
          </div>
        </Link>
        <button
          className="sidebar-mobile-close"
          aria-label="Close navigation"
          title="Close navigation"
          onClick={() => setMobileOpen(false)}
        >
          <X size={17} />
        </button>
        <button
          className="sidebar-toggle"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
        <nav
          aria-label={
            title === "Doctor Portal"
              ? "Main navigation"
              : "Administration navigation"
          }
        >
          {links.map((link) => (
            <div key={link.to}>
              {link.group && <div className="nav-label">{link.group}</div>}
              <Link
                to={link.to}
                title={collapsed ? link.label : undefined}
                className={`nav-link ${active(link.to) ? "active" : ""}`}
                aria-current={active(link.to) ? "page" : undefined}
              >
                <link.icon />
                <span>{link.label}</span>
                {Boolean(link.count) && (
                  <span className="nav-count">{link.count}</span>
                )}
              </Link>
            </div>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="app-header">
          <button
            className="icon-button mobile-menu"
            ref={menuRef}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="header-breadcrumb">
            {title}
            <ChevronRight size={13} />
            <strong>{currentTitle}</strong>
          </div>
          <div className="header-tools">
            <span className="date-label header-date">
              {date(new Date().toISOString())}
            </span>
            {headerAction}
            <button
              className="icon-button"
              title={`Switch to ${data.preferences.theme === "dark" ? "light" : "dark"} mode`}
              aria-label="Toggle color theme"
              onClick={() =>
                updateData((next) => {
                  next.preferences.theme =
                    next.preferences.theme === "dark" ? "light" : "dark";
                })
              }
            >
              {data.preferences.theme === "dark" ? (
                <Sun size={20} />
              ) : (
                <Moon size={20} />
              )}
            </button>
            <details className="profile-menu">
              <summary
                aria-label={
                  title === "Doctor Portal" ? "Doctor profile" : "Admin profile"
                }
              >
                <Avatar name={profile.name} />
                <ChevronDown size={15} />
              </summary>
              <div className="profile-popover">
                <strong>{profile.name}</strong>
                <p>{profile.detail}</p>
                <Link to={settings}>
                  <Settings size={15} />
                  Profile & settings
                </Link>
                <button
                  onClick={async () => {
                    auth.logout();
                    await navigate({ to: "/login" });
                  }}
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            </details>
          </div>
        </header>
        <main className="page-content" id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="prototype-footer">
          <span>
            <ShieldCheck size={12} />
            Not for clinical use
          </span>
          <span>CardioAssist AI / {title}</span>
        </footer>
      </div>
    </div>
  );
}
