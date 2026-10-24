import { workspaceText } from "@/lib/workspace-copy";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Smartphone, ArrowRight, Check } from "lucide-react";
import {
  useAppData,
  updateData,
  createAssessment,
  latestAssessment,
} from "@/data/store";
import {
  PageHeader,
  EmptyState,
  date,
  useAction,
  Modal,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
export default function Notifications() {
  const data = useAppData();
  const [filter, setFilter] = useState("All");
  const [simulate, setSimulate] = useState(false);
  const [patientId, setPatientId] = useState(data.patients[0]?.id || "");
  const { pending, run } = useAction();
  const notifications = data.notifications.filter(
    (n) => filter === "All" || !n.read,
  );
  const markRead = (id: string) =>
    updateData((d) => {
      const item = d.notifications.find((n) => n.id === id);
      if (item) item.read = true;
    });
  const submitMobile = async () => {
    const patient = data.patients.find((p) => p.id === patientId);
    if (!patient) return;
    const latest = latestAssessment(data, patientId);
    const inputs = latest
      ? {
          ...latest.inputs,
          systolicBP: Math.min(250, latest.inputs.systolicBP + 3),
        }
      : {
          age: patient.age,
          sex: patient.sex,
          systolicBP: 125,
          cholesterol: 190,
          smoking: false,
          diabetes: false,
        };
    if (
      await run(
        () => createAssessment(patientId, inputs, "Mobile"),
        "Mobile assessment submitted. A new notification is available.",
      )
    )
      setSimulate(false);
  };
  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Patient submissions, connection requests, and review updates."
        action={
          <>
            <Button
              variant="outline"
              onClick={() =>
                updateData((d) => {
                  d.notifications.forEach((n) => {
                    n.read = true;
                  });
                })
              }
              disabled={!data.notifications.some((n) => !n.read)}
            >
              <CheckCheck size={15} />
              Mark all read
            </Button>
            <Button
              disabled={!data.patients.length}
              onClick={() => setSimulate(true)}
            >
              <Smartphone size={15} />
              Simulate mobile submission
            </Button>
          </>
        }
      />
      <div className="tabs">
        {["All", "Unread"].map((value) => (
          <button
            key={value}
            className={filter === value ? "selected" : ""}
            onClick={() => setFilter(value)}
          >
            {value}
            {value === "Unread"
              ? ` (${data.notifications.filter((n) => !n.read).length})`
              : ""}
          </button>
        ))}
      </div>
      <section className="panel">
        {notifications.length ? (
          notifications.map((n) => (
            <article
              className={`notification-item ${n.read ? "" : "unread"}`}
              key={n.id}
            >
              <span className="timeline-icon">
                <Bell size={15} />
              </span>
              <div>
                <h3>
                  {n.title}
                  {!n.read && (
                    <span className="badge status-needs-info ml-2">New</span>
                  )}
                </h3>
                <p>{workspaceText(n.message)}</p>
                <small>{date(n.date, true)} · Cairo time</small>
              </div>
              <div className="actions">
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Mark as read"
                    aria-label={`Mark ${n.title} as read`}
                    onClick={() => markRead(n.id)}
                  >
                    <Check size={16} />
                  </Button>
                )}
                <Link
                  to={n.href}
                  className="row-arrow"
                  title="Open record"
                  aria-label={`Open ${n.title}`}
                  onClick={() => markRead(n.id)}
                >
                  <ArrowRight size={17} />
                </Link>
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            title="No unread notifications"
            detail="You're caught up on your workspace."
          />
        )}
      </section>
      {simulate && (
        <Modal
          title="Simulate mobile assessment"
          onClose={() => {
            if (!pending) setSimulate(false);
          }}
        >
          <p>
            Select a connected patient to submit assessment inputs and notify
            the doctor.
          </p>
          <div className="field">
            <label htmlFor="mobile-patient">Connected patient</label>
            <select
              id="mobile-patient"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            >
              {data.patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {workspaceText(p.name)} · {p.mrn}
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setSimulate(false)}
            >
              Cancel
            </Button>
            <Button disabled={pending || !patientId} onClick={submitMobile}>
              <Smartphone size={15} />
              {pending ? "Submitting..." : "Submit assessment"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
