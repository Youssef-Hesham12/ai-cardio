import { workspaceText } from "@/lib/workspace-copy";
import { useParams } from "@tanstack/react-router";
import {
  FileText,
  SlidersHorizontal,
  History,
  ClipboardCheck,
} from "lucide-react";
import { useAppData } from "@/data/store";
import {
  PageHeader,
  DemoNotice,
  Go,
  EmptyState,
  SectionTitle,
  RiskBadge,
  StatusBadge,
  InputSummary,
  date,
} from "@/components/shared";
import { ExplanationChart } from "../explainability/charts";
import ReviewForm from "../reviews/ReviewForm";
export default function AssessmentResult() {
  const { assessmentId } = useParams({ strict: false });
  const data = useAppData();
  const assessment = data.assessments.find((a) => a.id === assessmentId);
  const patient = data.patients.find((p) => p.id === assessment?.patientId);
  if (!assessment || !patient)
    return (
      <EmptyState
        title="Assessment not found"
        detail="This record is no longer available."
        action={<Go to="/assessments">All assessments</Go>}
      />
    );
  return (
    <>
      <PageHeader
        title="Assessment Result"
        subtitle={`${workspaceText(patient.name)} · ${date(assessment.date, true)} · ${assessment.id.toUpperCase()}`}
        back={`/patients/${patient.id}`}
        action={
          <>
            <Go to={`/assessments/${assessment.id}/simulator`}>
              <SlidersHorizontal size={15} />
              Scenario simulator
            </Go>
            <Go to={`/reports/${assessment.id}`} primary>
              <FileText size={15} />
              View report
            </Go>
          </>
        }
      />
      <DemoNotice />
      <div className="two-column">
        <div className="stack">
          <section className="panel">
            <SectionTitle
              title="Assessment Summary"
              action={<StatusBadge status={assessment.status} />}
            />
            <div className="panel-body">
              <span className="muted text-xs">Assessment score</span>
              <div className="score-display">
                {assessment.result.score}
                <small> / 100 points</small>
              </div>
              <RiskBadge risk={assessment.result.riskLevel} />
              <div className="score-track">
                <div style={{ width: `${assessment.result.score}%` }} />
              </div>
              <p className="muted text-xs">
                These points are not a medically calibrated probability or a
                prediction of coronary artery disease.
              </p>
              <dl className="details mt-5">
                <div>
                  <dt>Model version</dt>
                  <dd>{workspaceText(assessment.result.modelVersion)}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{assessment.source || "Doctor"}</dd>
                </div>
                <div>
                  <dt>Follow-up</dt>
                  <dd>{assessment.followUp ? "Required" : "Not requested"}</dd>
                </div>
              </dl>
            </div>
          </section>
          <section className="panel">
            <SectionTitle title="Input Summary" />
            <div className="panel-body">
              <InputSummary inputs={assessment.inputs} />
            </div>
          </section>
          <div className="actions">
            <Go to={`/patients/${patient.id}/history`}>
              <History size={15} />
              Patient history
            </Go>
            <Go to={`/patients/${patient.id}`}>Patient profile</Go>
          </div>
        </div>
        <div className="stack">
          <section className="panel">
            <SectionTitle
              title="Explainable AI"
              subtitle="signed feature contributions"
            />
            <div className="panel-body">
              <ExplanationChart result={assessment.result} />
            </div>
          </section>
          <section className="panel">
            <SectionTitle
              title="Doctor Review"
              subtitle="Review the supplied data and document your observations"
              action={<ClipboardCheck size={18} className="text-primary" />}
            />
            <ReviewForm key={assessment.id} assessment={assessment} />
          </section>
        </div>
      </div>
    </>
  );
}
