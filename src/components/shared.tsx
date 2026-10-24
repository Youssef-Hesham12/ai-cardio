import { workspaceText } from "@/lib/workspace-copy";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Inbox,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "./ui/button";
import type {
  Assessment,
  AssessmentInput,
  RiskLevel,
  ReviewStatus,
} from "@/data/mockData";
export const date = (value: string, time = false) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
export const initials = (name: string) =>
  name
    .replace(/^Dr\. /, "")
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("");
export function Avatar({ name, size = "" }: { name: string; size?: string }) {
  return (
    <span className={`avatar ${size}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
export function Go({
  to,
  children,
  className = "",
  primary = false,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  primary?: boolean;
}) {
  const [path, query] = to.split("?");
  const search = query
    ? Object.fromEntries(new URLSearchParams(query))
    : undefined;
  return (
    <Link
      data-slot="button"
      data-size="default"
      to={path}
      search={search}
      className={`${buttonVariants({ variant: primary ? "default" : "outline" })} ${className}`}
    >
      {children}
    </Link>
  );
}
export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  back?: string;
}) {
  return (
    <div className="page-heading">
      <div>
        {back && (
          <Go to={back} className="back-link">
            <ArrowLeft size={14} />
            Back
          </Go>
        )}
        <h1>{workspaceText(title)}</h1>
        {subtitle && <p>{workspaceText(subtitle)}</p>}
      </div>
      {action && <div className="actions">{action}</div>}
    </div>
  );
}
export function RiskBadge({ risk }: { risk?: RiskLevel }) {
  return (
    <span className={`badge risk-${(risk || "unknown").toLowerCase()}`}>
      <span className="badge-dot" />
      {risk === "Moderate" ? "Medium" : risk || "Unknown"}
      {risk ? " risk" : ""}
    </span>
  );
}
export function StatusBadge({ status }: { status?: ReviewStatus | string }) {
  return (
    <span
      className={`badge status-${(status || "none").toLowerCase().replace(/ /g, "-")}`}
    >
      {status === "Reviewed" && <Check size={12} />}
      {status === "Pending" ? "Pending review" : status || "No assessment"}
    </span>
  );
}
export function EmptyState({
  title = "No records found",
  detail = "Try adjusting your filters.",
  action,
}: {
  title?: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Inbox size={28} />
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}
export function LoadingState() {
  return (
    <div className="loading-grid" aria-label="Loading records" role="status">
      {[0, 1, 2].map((n) => (
        <div className="skeleton" key={n} />
      ))}
    </div>
  );
}
export function DemoNotice({ scenario = false }: { scenario?: boolean }) {
  return (
    <div className="demo-notice">
      <CircleAlert size={16} />
      <span>
        {scenario
          ? "Scenario estimates are unvalidated and do not predict clinical outcomes or treatment effects."
          : "Not for clinical use. Scores and explanations are not clinically validated."}
      </span>
    </div>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = "Search patients or ID...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-input">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button aria-label="Clear search" onClick={() => onChange("")}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="dialog-title"
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-header">
        <h2 id="dialog-title">{title}</h2>
        <Button
          variant="ghost"
          size="icon"
          title="Close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={18} />
        </Button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
const ToastContext = createContext<(message: string, error?: boolean) => void>(
  () => {},
);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <ToastContext.Provider
      value={(message, error = false) => setToast({ message, error })}
    >
      {children}
      {toast && (
        <div
          className={`toast ${toast.error ? "toast-error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <CircleAlert size={20} /> : <Check size={20} />}
          <span>{workspaceText(toast.message)}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export function useAction() {
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const run = async (action: () => Promise<unknown>, message?: string) => {
    if (pending) return false;
    setPending(true);
    try {
      await action();
      if (message) toast(message);
      return true;
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Unable to complete the action.",
        true,
      );
      return false;
    } finally {
      setPending(false);
    }
  };
  return { pending, run };
}
export function PendingIcon({ pending }: { pending: boolean }) {
  return pending ? (
    <LoaderCircle size={16} className="animate-spin" />
  ) : (
    <Check size={16} />
  );
}
export const inputLabels: Record<keyof AssessmentInput, string> = {
  age: "Age (years)",
  sex: "Sex",
  systolicBP: "Systolic BP (mmHg)",
  cholesterol: "Total cholesterol (mg/dL)",
  smoking: "Current smoker",
  diabetes: "Diabetes history",
};
export function InputSummary({ inputs }: { inputs: AssessmentInput }) {
  return (
    <dl className="details">
      {Object.entries(inputs).map(([key, value]) => (
        <div key={key}>
          <dt>{inputLabels[key as keyof AssessmentInput]}</dt>
          <dd>{typeof value === "boolean" ? (value ? "Yes" : "No") : value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function AssessmentTable({
  assessments,
  patientName,
}: {
  assessments: Assessment[];
  patientName: (id: string) => string;
}) {
  if (!assessments.length)
    return <EmptyState title="No assessments in this view" />;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Assessment</th>
            <th>Classification</th>
            <th>Review status</th>
            <th>Date</th>
            <th>
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {assessments.map((a) => (
            <tr key={a.id}>
              <td>
                <Link
                  to="/patients/$patientId"
                  params={{ patientId: a.patientId }}
                  className="patient-cell"
                >
                  <Avatar name={patientName(a.patientId)} />
                  <strong>{workspaceText(patientName(a.patientId))}</strong>
                </Link>
              </td>
              <td>
                <span className="record-id">{a.id.toUpperCase()}</span>
                <small>{a.source || "Doctor"} submission</small>
              </td>
              <td>
                <RiskBadge risk={a.result.riskLevel} />
              </td>
              <td>
                <StatusBadge status={a.status} />
              </td>
              <td className="muted nowrap">{date(a.date)}</td>
              <td>
                <Link
                  to="/assessments/$assessmentId"
                  params={{ assessmentId: a.id }}
                  className="row-arrow"
                  title="Open assessment"
                  aria-label={`Open assessment ${a.id}`}
                >
                  <ArrowRight size={17} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function ActivityTimeline({
  events,
}: {
  events: { id: string; title: string; detail: string; date: string }[];
}) {
  return events.length ? (
    <div className="timeline">
      {events.map((e) => (
        <div className="timeline-item" key={e.id}>
          <span className="timeline-icon">
            <Activity size={14} />
          </span>
          <div>
            <strong>{e.title}</strong>
            <p>{workspaceText(e.detail)}</p>
            <small>{date(e.date, true)} · Cairo</small>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <EmptyState
      title="No activity yet"
      detail="Saved actions will appear here."
    />
  );
}
