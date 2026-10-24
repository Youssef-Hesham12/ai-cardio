import { workspaceText } from "@/lib/workspace-copy";
import { useParams } from "@tanstack/react-router";
import { HeartPulse, Printer, ArrowLeft } from "lucide-react";
import { useAppData } from "@/data/store";
import {
  PageHeader,
  Go,
  EmptyState,
  date,
  InputSummary,
  RiskBadge,
  StatusBadge,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
export default function Report() {
  const { assessmentId } = useParams({ strict: false });
  const data = useAppData();
  const assessment = data.assessments.find((a) => a.id === assessmentId);
  const patient = data.patients.find((p) => p.id === assessment?.patientId);
  if (!assessment || !patient)
    return (
      <EmptyState
        title="Report not found"
        action={<Go to="/reports">All reports</Go>}
      />
    );
  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Assessment Report"
          subtitle={`${workspaceText(patient.name)} · ${assessment.id.toUpperCase()}`}
          action={
            <>
              <Go to={`/assessments/${assessment.id}`}>
                <ArrowLeft size={15} />
                Back to assessment
              </Go>
              <Button onClick={() => window.print()}>
                <Printer size={15} />
                Print / Save as PDF
              </Button>
            </>
          }
        />
      </div>
      <article className="print-report">
        <div className="report-heading">
          <div>
            <div className="report-brand">
              <HeartPulse size={28} />
              CardioAssist AI
            </div>
            <p className="muted text-xs mt-2">CAD Assessment · Doctor Portal</p>
          </div>
          <div className="text-xs">
            <p>{assessment.id.toUpperCase()}</p>
            <p className="muted">{date(assessment.date, true)} · Cairo</p>
            <p className="mt-2">{data.doctor.name}</p>
          </div>
        </div>
        <section className="report-section">
          <h2>Patient Details</h2>
          <div className="equal-columns">
            <dl className="details">
              <div>
                <dt>Name</dt>
                <dd>{workspaceText(patient.name)}</dd>
              </div>
              <div>
                <dt>Patient identifier</dt>
                <dd>{patient.mrn}</dd>
              </div>
            </dl>
            <dl className="details">
              <div>
                <dt>Age</dt>
                <dd>{patient.age} years</dd>
              </div>
              <div>
                <dt>Sex</dt>
                <dd>{patient.sex}</dd>
              </div>
            </dl>
          </div>
        </section>
        <section className="report-section">
          <h2>Assessment Inputs</h2>
          <InputSummary inputs={assessment.inputs} />
        </section>
        <section className="report-section">
          <h2>Assessment Result</h2>
          <div className="actions">
            <RiskBadge risk={assessment.result.riskLevel} />
            <StatusBadge status={assessment.status} />
          </div>
          <p className="mt-4">
            Assessment score:{" "}
            <strong>{assessment.result.score} / 100 points</strong>
          </p>
          <p>
            Assessment version: {workspaceText(assessment.result.modelVersion)}.
            These points are not a medically calibrated probability.
          </p>
        </section>
        <section className="report-section">
          <h2>Explanation</h2>
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Signed contribution</th>
              </tr>
            </thead>
            <tbody>
              {assessment.result.contributions.map((c) => (
                <tr key={c.feature}>
                  <td>{c.feature}</td>
                  <td>
                    {c.value > 0 ? "+" : ""}
                    {c.value} points
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3">
            Feature contributions are not clinically validated and do not
            establish causation or treatment effects.
          </p>
        </section>
        <section className="report-section">
          <h2>Doctor Review Notes</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>
            {workspaceText(
              assessment.doctorNotes || "No doctor review has been recorded.",
            )}
          </p>
          <p className="mt-3">
            Follow-up:{" "}
            {assessment.followUp ? "Requested by doctor" : "Not requested"}
          </p>
        </section>
        <div className="mt-6">
          <strong className="text-xs">Not for clinical use</strong>
          <p className="muted text-xs mt-2">
            This report is not clinically validated and does not provide a
            diagnosis or medical treatment recommendations.
          </p>
        </div>
      </article>
    </>
  );
}
