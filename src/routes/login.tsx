import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
  Navigate,
} from "@tanstack/react-router";
import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/data/store";
import { Button } from "@/components/ui/button";
import { PublicBrand as LoginBrand } from "@/features/public/PublicBrand";
import { PublicThemeToggle } from "@/features/public/PublicThemeToggle";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  recordLogin,
  verifyCredentials,
} from "@/data/accounts";
import type { AccountRole } from "@/data/accounts";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import "@/features/auth/login.css";

const ACCOUNT_EMAIL = "doctor@cardioassist.demo";
const ACCOUNT_PASSWORD = "demo123";
const CoronaryScene = lazy(() => import("@/features/auth/CoronaryScene"));
export const Route = createFileRoute("/login")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated)
      throw redirect({
        to:
          context.auth.session?.role === "super_admin"
            ? "/admin"
            : "/dashboard",
      });
  },
  component: Login,
});

function Login() {
  const auth = useAuth();
  const data = useAppData();
  const navigate = useNavigate();
  const [email, setEmail] = useState(ACCOUNT_EMAIL);
  const [password, setPassword] = useState(ACCOUNT_PASSWORD);
  const [role, setRole] = useState<AccountRole>("doctor");
  const [showPassword, setShowPassword] = useState(false);
  const [visualPaused, setVisualPaused] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [visualReset, setVisualReset] = useState(0);
  const [error, setError] = useState<{
    message: string;
    credentials: boolean;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const loginAttempt = useRef<AbortController | null>(null);
  useEffect(() => () => loginAttempt.current?.abort(), []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => {
      if (media.matches) setVisualPaused(true);
    };
    media.addEventListener("change", reduce);
    return () => media.removeEventListener("change", reduce);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      data.preferences.theme === "dark",
    );
  }, [data.preferences.theme]);
  useEffect(() => {
    const title = document.title;
    document.title = `${role === "doctor" ? "Doctor" : "Super Admin"} Sign In | CardioAssist AI`;
    return () => {
      document.title = title;
    };
  }, [role]);

  const login = async () => {
    if (pending) return;
    const attempt = new AbortController();
    loginAttempt.current = attempt;
    setPending(true);
    setError(null);
    let credentialsAccepted = false;
    try {
      const session = await verifyCredentials(email, password, role);
      credentialsAccepted = true;
      if (attempt.signal.aborted) return;
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (attempt.signal.aborted) return;
      auth.login(session);
      recordLogin(session);
      await navigate({ to: role === "super_admin" ? "/admin" : "/dashboard" });
    } catch (failure) {
      if (!attempt.signal.aborted)
        setError({
          message:
            !credentialsAccepted && failure instanceof Error
              ? failure.message
              : "We couldn't open your workspace. Check that browser storage is available and try again.",
          credentials: !credentialsAccepted,
        });
    } finally {
      if (!attempt.signal.aborted) setPending(false);
    }
  };
  if (auth.isAuthenticated)
    return (
      <Navigate
        to={auth.session?.role === "super_admin" ? "/admin" : "/dashboard"}
      />
    );
  return (
    <main className="login-page public-page">
      <section className="login-workspace" aria-labelledby="login-title">
        <header className="login-header">
          <LoginBrand className="login-mobile-brand" />
          <div className="login-header-actions">
            <PublicThemeToggle />
            <Link
              to="/"
              className="login-back"
              aria-label="Back to website"
              title="Back to website"
              onClick={() => {
                loginAttempt.current?.abort();
                setPending(false);
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to website</span>
            </Link>
          </div>
        </header>
        <div className="login-form">
          <div
            className="segmented login-access-switch"
            role="group"
            aria-label="Portal access"
          >
            {(["doctor", "super_admin"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={role === option}
                className={role === option ? "selected" : ""}
                onClick={() => {
                  loginAttempt.current?.abort();
                  setPending(false);
                  setError(null);
                  setRole(option);
                  setEmail(option === "doctor" ? ACCOUNT_EMAIL : ADMIN_EMAIL);
                  setPassword(
                    option === "doctor" ? ACCOUNT_PASSWORD : ADMIN_PASSWORD,
                  );
                }}
              >
                {option === "doctor" ? (
                  <Stethoscope size={14} />
                ) : (
                  <ShieldCheck size={14} />
                )}
                {option === "doctor" ? "Doctor" : "Super Admin"}
              </button>
            ))}
          </div>
          <div className="login-introduction">
            <span className="login-kicker">
              {role === "doctor" ? "DOCTOR SIGN IN" : "SUPER ADMIN SIGN IN"}
            </span>
            <h1 id="login-title">
              <span>Welcome back,</span>{" "}
              {role === "doctor" ? "Doctor." : "Admin."}
            </h1>
            <p>
              {role === "doctor"
                ? "Sign in to your doctor workspace."
                : "Sign in to your administration workspace."}
            </p>
          </div>
          <form
            aria-label={
              role === "doctor" ? "Doctor sign in" : "Super Admin sign in"
            }
            aria-busy={pending}
            onSubmit={async (e) => {
              e.preventDefault();
              if (pending) return;
              await login();
            }}
          >
            <div className="login-field">
              <label htmlFor="login-email">Email address</label>
              <div className="login-input">
                <Mail size={18} aria-hidden="true" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  disabled={Boolean(pending)}
                  value={email}
                  aria-invalid={error?.credentials || undefined}
                  aria-describedby={error ? "login-error" : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                />
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-input">
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={Boolean(pending)}
                  value={password}
                  aria-invalid={error?.credentials || undefined}
                  aria-describedby={error ? "login-error" : undefined}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={Boolean(pending)}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="login-feedback">
              {error && (
                <p className="login-error" role="alert" id="login-error">
                  <CircleAlert size={16} />
                  <span>{error.message}</span>
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="login-submit"
              disabled={Boolean(pending)}
            >
              <span>{pending ? "Signing in..." : "Sign in"}</span>
              {pending ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <ArrowRight size={17} />
              )}
            </Button>
          </form>
          <p className="login-footer">Not for clinical use.</p>
        </div>
      </section>
      <aside className="login-story" aria-label="CardioAssist doctor portal">
        <div className="login-story-header">
          <span className="login-edition">VASCULAR STUDY / 002</span>
          <span className="login-study-label">Concept visualization</span>
        </div>
        <div className="login-vessel-visual">
          <Suspense
            fallback={
              <div className="coronary-scene">
                <img
                  className="coronary-fallback"
                  src="/images/coronary-study.png"
                  alt="Illustrative translucent coronary-vessel study"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            }
          >
            <CoronaryScene paused={visualPaused} resetKey={visualReset} />
          </Suspense>
          <span className="login-vessel-caption">
            TRANSLUCENT WALL / INNER LUMEN
          </span>
          <div
            className="login-vessel-controls"
            role="group"
            aria-label="Vessel animation"
          >
            <button
              type="button"
              aria-label={
                visualPaused
                  ? "Play vessel animation"
                  : "Pause vessel animation"
              }
              title={
                visualPaused
                  ? "Play vessel animation"
                  : "Pause vessel animation"
              }
              onClick={() => setVisualPaused(!visualPaused)}
            >
              {visualPaused ? <Play size={15} /> : <Pause size={15} />}
            </button>
            <button
              type="button"
              aria-label="Reset vessel view"
              title="Reset vessel view"
              onClick={() => setVisualReset((value) => value + 1)}
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
        <div className="login-story-copy">
          <span className="login-story-kicker">A CLOSER PERSPECTIVE</span>
          <h2>
            Look beneath
            <br />
            the surface.
          </h2>
          <div className="login-story-rule" />
          <p>
            At the heart of every record,
            <br />
            there is a person.
          </p>
        </div>
        <p className="login-visual-note">
          Illustrative model. Not an anatomical reference.
        </p>
      </aside>
    </main>
  );
}
