import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Activity,
  ChartNoAxesCombined,
  FileText,
  CircleAlert,
  History,
  Menu,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ScanLine,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PublicBrand } from "@/features/public/PublicBrand";
import { PublicThemeToggle } from "@/features/public/PublicThemeToggle";
import type { HeartView } from "./HeartScene";
import "./landing.css";
const HeartScene = lazy(() => import("./HeartScene"));
const ClinicalPreview = lazy(() => import("./ClinicalPreview"));
const capabilities = [
  {
    icon: Activity,
    title: "AI risk assessment",
    text: "A structured workflow for assessment inputs and results.",
  },
  {
    icon: ScanLine,
    title: "Explainable AI",
    text: "Contributing factors alongside the result, not hidden behind it.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Clinical insights",
    text: "Patient inputs and review notes, kept in the same context.",
  },
  {
    icon: History,
    title: "Patient history",
    text: "A connected record of assessments and doctor reviews.",
  },
  {
    icon: FileText,
    title: "Clinical reporting",
    text: "Clear, printable summaries of the assessment and review.",
  },
];
const steps = [
  [
    "01",
    "Start with context",
    "Review the patient's submitted information and assessment history.",
  ],
  [
    "02",
    "Explore an assessment",
    "Explore the cardiovascular risk assessment workflow.",
  ],
  [
    "03",
    "Understand the factors",
    "Explore contributions alongside the example score.",
  ],
  [
    "04",
    "Bring human judgment",
    "Record observations and keep a traceable doctor review.",
  ],
];
export default function Landing() {
  const { isAuthenticated, session } = useAuth();
  const destination = isAuthenticated
    ? session?.role === "super_admin"
      ? "/admin"
      : "/dashboard"
    : "/login";
  const root = useRef<HTMLDivElement>(null);
  const previewHost = useRef<HTMLDivElement>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paused, setPaused] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [view, setView] = useState<HeartView>("surface");
  const [resetKey, setResetKey] = useState(0);
  useEffect(() => {
    document.body.classList.add("intro-route");
    const title = document.title;
    document.title = "CardioAssist AI | Cardiac insight, in context";
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => {
      if (media.matches) setPaused(true);
    };
    media.addEventListener("change", reduce);
    let observer: IntersectionObserver | undefined;
    if (root.current && !media.matches) {
      root.current.classList.add("reveal-ready");
      observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-revealed");
              observer?.unobserve(entry.target);
            }
          }),
        { threshold: 0.08 },
      );
      root.current
        .querySelectorAll("[data-reveal]")
        .forEach((el) => observer?.observe(el));
    }
    return () => {
      observer?.disconnect();
      media.removeEventListener("change", reduce);
      document.body.classList.remove("intro-route");
      document.title = title;
    };
  }, []);
  useEffect(() => {
    if (!previewHost.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPreviewVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(previewHost.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menuOpen]);
  return (
    <div className="intro-site public-page" ref={root}>
      <a href="#intro-main" className="intro-skip">
        Skip to content
      </a>
      <header className="intro-header">
        <PublicBrand />
        <nav
          className={`intro-nav ${menuOpen ? "is-open" : ""}`}
          aria-label="Website navigation"
          id="intro-navigation"
        >
          <a href="#capabilities" onClick={() => setMenuOpen(false)}>
            Platform
          </a>
          <a href="#approach" onClick={() => setMenuOpen(false)}>
            How it works
          </a>
          <a href="#workspace" onClick={() => setMenuOpen(false)}>
            Clinical preview
          </a>
        </nav>
        <div className="intro-header-actions">
          <PublicThemeToggle />
          <Link to={destination} className="intro-portal-link">
            {isAuthenticated ? "Your dashboard" : "Doctor sign in"}
            <ArrowUpRight size={15} />
          </Link>
          <button
            className="intro-menu-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="intro-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <main id="intro-main">
        <section className="intro-hero" aria-labelledby="intro-title">
          <Suspense
            fallback={
              <div className="intro-heart-scene">
                <img
                  className="intro-heart-fallback"
                  src="/images/heart-study.png"
                  alt="Sculptural cardiac study"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            }
          >
            <HeartScene paused={paused} view={view} resetKey={resetKey} />
          </Suspense>
          <div className="intro-hero-copy">
            <p className="intro-eyebrow">
              <span />
              AI-ASSISTED CARDIAC RISK ASSESSMENT
            </p>
            <h1 id="intro-title">
              CardioAssist <span>AI</span>
            </h1>
            <p className="intro-hero-statement">
              Cardiac insight.
              <br />
              In human context.
            </p>
            <p className="intro-hero-description">
              A clearer perspective on cardiovascular risk. Patient information,
              explainable assessments, and a doctor's judgment, connected in one
              workflow.
            </p>
            <div className="intro-hero-actions">
              <Link
                to={destination}
                className="public-button public-button-solid"
              >
                Explore Platform
                <ArrowUpRight size={17} />
              </Link>
              <a href="#approach" className="intro-text-link">
                How It Works
                <ArrowDown size={15} />
              </a>
            </div>
            <p className="intro-academic-note">
              <CircleAlert size={14} />
              Not for clinical use.
            </p>
          </div>
          <div className="intro-study-caption">
            <span>01 / CARDIAC STRUCTURE</span>
            <p>
              A closer look.
              <br />A broader perspective.
            </p>
            <small>
              study.
              <br />
              Not an anatomical reference.
            </small>
          </div>
          <div className="intro-scene-toolbar">
            <div
              className="intro-view-switch"
              role="group"
              aria-label="Heart appearance"
            >
              {(["surface", "structure"] as const).map((mode) => (
                <button
                  key={mode}
                  className={view === mode ? "selected" : ""}
                  aria-pressed={view === mode}
                  onClick={() => setView(mode)}
                >
                  {mode === "surface" ? "Surface" : "Structure"}
                </button>
              ))}
            </div>
            <button
              className="intro-icon-button"
              aria-label={
                paused ? "Play heart animation" : "Pause heart animation"
              }
              title={paused ? "Play heart animation" : "Pause heart animation"}
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button
              className="intro-icon-button"
              aria-label="Reset heart view"
              title="Reset heart view"
              onClick={() => setResetKey((value) => value + 1)}
            >
              <RotateCcw size={14} />
            </button>
          </div>
          <a
            href="#capabilities"
            className="intro-hero-index"
            aria-label="Explore platform capabilities"
          >
            <span>THE PLATFORM</span>
            <ArrowDown size={15} />
          </a>
        </section>
        <div className="intro-principle-strip">
          <span>Context before conclusions.</span>
          <span>Explanations beside results.</span>
          <span>Judgment stays human.</span>
        </div>
        <section className="intro-section intro-capabilities" id="capabilities">
          <div className="intro-section-top" data-reveal>
            <span className="intro-kicker">01 / PLATFORM CAPABILITIES</span>
            <span className="intro-section-note">
              One connected assessment workflow.
            </span>
          </div>
          <div className="intro-approach-heading" data-reveal>
            <h2>
              From information
              <br />
              to understanding.
            </h2>
            <p>
              A cardiovascular risk assessment workspace built around the
              complete picture, not a score in isolation.
            </p>
          </div>
          <div className="intro-capability-grid" data-reveal>
            {capabilities.map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <Icon size={22} strokeWidth={1.6} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="intro-workflow" id="approach">
          <div className="intro-section">
            <div className="intro-section-top" data-reveal>
              <span className="intro-kicker">02 / HOW IT WORKS</span>
              <span className="intro-section-note">
                A considered process. A traceable review.
              </span>
            </div>
            <div className="intro-workflow-title" data-reveal>
              <h2>
                An assessment.
                <br />
                With the reasoning intact.
              </h2>
              <p>
                From the first input to the final review,
                <br />
                keep context within reach.
              </p>
            </div>
            <div className="intro-workflow-grid">
              <ol className="intro-steps" data-reveal>
                {steps.map(([number, title, text]) => (
                  <li key={number}>
                    <span>{number}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div
                className="intro-preview-host"
                id="workspace"
                ref={previewHost}
              >
                {previewVisible && (
                  <Suspense
                    fallback={
                      <div
                        className="intro-preview-loading"
                        aria-label="Loading assessment"
                      />
                    }
                  >
                    <ClinicalPreview destination={destination} />
                  </Suspense>
                )}
              </div>
            </div>
          </div>
        </section>
        <section className="intro-section intro-why" id="perspective">
          <figure className="intro-why-image" data-reveal>
            <img
              src="/images/care-conversation.jpg"
              alt="scene of a doctor listening to a patient in a clinic"
              width="1536"
              height="1024"
              loading="lazy"
            />
            <figcaption>imagery. Not a real patient.</figcaption>
          </figure>
          <div className="intro-why-copy" data-reveal>
            <span className="intro-kicker">03 / WHY CARDIOASSIST</span>
            <h2>
              Keep the person
              <br />
              in the picture.
            </h2>
            <p>
              Less fragmented context. More room for thoughtful review. Patient
              history, contributing factors, and observations stay connected as
              the assessment evolves.
            </p>
            <div className="intro-why-facts">
              <span>Connected patient history</span>
              <span>Transparent explanations</span>
              <span>Doctor-led review</span>
            </div>
            <div className="intro-project-notes" id="questions">
              <details>
                <summary>
                  Does CardioAssist diagnose heart disease?
                  <Plus size={16} />
                </summary>
                <p>
                  No. CardioAssist is not clinically validated and must not be
                  used for diagnosis, treatment, or emergency decisions.
                </p>
              </details>
              <details>
                <summary>
                  How do patients connect with a doctor?
                  <Plus size={16} />
                </summary>
                <p>
                  A patient sends a connection request through the patient app.
                  After the doctor accepts, the patient appears in their list.
                  The patient-app connection is not yet live.
                </p>
              </details>
            </div>
          </div>
        </section>
        <section className="intro-closing">
          <div className="intro-closing-inner">
            <div>
              <span className="intro-kicker">TAKE A CLOSER LOOK</span>
              <h2>Explore CardioAssist AI.</h2>
              <p>Patient context. Clear assessments. Your perspective.</p>
            </div>
            <Link
              to={destination}
              className="public-button public-button-solid"
            >
              Explore Platform
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="intro-footer">
        <PublicBrand />
        <p>Not for clinical use.</p>
        <a href="#intro-main">
          Back to top
          <ArrowRight size={15} className="intro-up-arrow" />
        </a>
      </footer>
    </div>
  );
}
