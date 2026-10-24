import { workspaceText } from "@/lib/workspace-copy";
import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import {
  Plus,
  Pencil,
  ArrowRight,
  History,
  FileText,
  MessageSquare,
} from "lucide-react";
import { useAppData, patientAssessments } from "@/data/store";
import {
  Avatar,
  Go,
  RiskBadge,
  StatusBadge,
  SectionTitle,
  InputSummary,
  ActivityTimeline,
  date,
  EmptyState,
  AssessmentTable,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import PatientEditor from "./PatientEditor";
export default function PatientProfile() {
  const { patientId } = useParams({ strict: false });
  const data = useAppData();
  const patient = data.patients.find((p) => p.id === patientId);
  const [edit, setEdit] = useState(false);
  const [tab, setTab] = useState("overview");
  if (!patient)
    return (
      <EmptyState
        title="Patient not found"
        detail="This record is unavailable."
        action={<Go to="/patients">Patient directory</Go>}
      />
    );
  const assessments = patientAssessments(data, patient.id);
  const latest = assessments[0];
  return (
    <>
      <Go to="/patients" className="back-link">
        Patient directory
      </Go>
      <div className="profile-heading">
        <Avatar name={workspaceText(patient.name)} size="large" />
        <div>
          <h1>{workspaceText(patient.name)}</h1>
          <p>
            {patient.mrn} · {patient.age} years · {patient.sex}
          </p>
          <div className="actions">
            <RiskBadge risk={latest?.result.riskLevel} />
            <StatusBadge status={latest?.status} />
          </div>
        </div>
        <div className="actions">
          <Go to={`/messages?patient=${encodeURIComponent(patient.id)}`}>
            <MessageSquare size={15} />
            Message patient
          </Go>
          <Button variant="outline" onClick={() => setEdit(true)}>
            <Pencil size={15} />
            Edit patient
          </Button>
          <Go to={`/patients/${patient.id}/assessments/new`} primary>
            <Plus size={15} />
            New assessment
          </Go>
        </div>
      </div>
      <div className="tabs">
        <button
          className={tab === "overview" ? "selected" : ""}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          className={tab === "notes" ? "selected" : ""}
          onClick={() => setTab("notes")}
        >
          Doctor notes
        </button>
        <button
          className={tab === "activity" ? "selected" : ""}
          onClick={() => setTab("activity")}
        >
          Review activity
        </button>
        <Go to={`/patients/${patient.id}/history`}>
          <History size={14} />
          Full history
        </Go>
      </div>
      {tab === "overview" ? (
        <div className="two-column">
          <div className="stack">
            <section className="panel">
              <SectionTitle title="Personal Information" />
              <div className="panel-body">
                <dl className="details">
                  {[
                    ["Patient ID", patient.mrn],
                    ["Age", `${patient.age} years`],
                    ["Sex", patient.sex],
                    ["email", patient.email || "Not provided"],
                    ["Phone", patient.phone || "Not provided"],
                    [
                      "Last updated",
                      date(patient.updatedAt || patient.lastVisit),
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
            <section className="panel">
              <SectionTitle title="Available Clinical Context" />
              <div className="panel-body">
                <p className="muted text-xs">
                  {workspaceText(patient.context || "No context provided yet.")}
                </p>
              </div>
            </section>
            <section className="panel">
              <SectionTitle title="Follow-up Status" />
              <div className="panel-body">
                <span
                  className={`badge ${patient.followUp ? "status-pending" : "status-reviewed"}`}
                >
                  {patient.followUp
                    ? "Follow-up required"
                    : "No follow-up requested"}
                </span>
              </div>
            </section>
          </div>
          <div className="stack">
            <section className="panel">
              <SectionTitle
                title="Latest CAD Assessment"
                subtitle="Latest result"
                action={
                  latest && (
                    <Go to={`/assessments/${latest.id}`}>
                      View result
                      <ArrowRight size={14} />
                    </Go>
                  )
                }
              />
              {latest ? (
                <div className="panel-body">
                  <div className="equal-columns">
                    <div>
                      <span className="muted text-xs">Assessment score</span>
                      <div className="score-display">
                        {latest.result.score}
                        <small> / 100 points</small>
                      </div>
                      <RiskBadge risk={latest.result.riskLevel} />
                      <p className="muted text-xs mt-4">
                        {date(latest.date)} ·{" "}
                        {workspaceText(latest.result.modelVersion)}
                      </p>
                    </div>
                    <InputSummary inputs={latest.inputs} />
                  </div>
                  <div className="form-actions">
                    <Go to={`/patients/${patient.id}/review`}>
                      Review assessment
                    </Go>
                    <Go to={`/reports/${latest.id}`}>
                      <FileText size={14} />
                      View report
                    </Go>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No assessments yet"
                  detail="Start a assessment to populate this record."
                />
              )}
            </section>
            <section className="panel">
              <SectionTitle
                title="Assessment History"
                subtitle={`${assessments.length} connected assessments`}
              />
              <AssessmentTable
                assessments={assessments.slice(0, 4)}
                patientName={() => patient.name}
              />
            </section>
          </div>
        </div>
      ) : tab === "notes" ? (
        <section className="panel">
          <SectionTitle
            title="Doctor Notes"
            action={
              latest && (
                <Go to={`/patients/${patient.id}/review`}>
                  <Pencil size={14} />
                  Add review
                </Go>
              )
            }
          />
          <div className="panel-body">
            {assessments
              .filter((a) => a.doctorNotes)
              .map((a) => (
                <div key={a.id} className="report-section">
                  <StatusBadge status={a.status} />
                  <p className="muted text-xs mt-2">
                    {date(a.date)} · {a.id.toUpperCase()}
                  </p>
                  <p className="mt-3 text-sm">{workspaceText(a.doctorNotes)}</p>
                </div>
              ))}
            {!assessments.some((a) => a.doctorNotes) && (
              <EmptyState
                title="No doctor notes yet"
                detail="Add notes through the review workflow."
              />
            )}
          </div>
        </section>
      ) : (
        <section className="panel">
          <SectionTitle title="Patient Activity" />
          <ActivityTimeline
            events={data.activities.filter((e) => e.patientId === patient.id)}
          />
        </section>
      )}
      {edit && (
        <PatientEditor patient={patient} onClose={() => setEdit(false)} />
      )}
    </>
  );
}
