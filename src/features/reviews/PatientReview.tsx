import { useParams } from "@tanstack/react-router";
import { useAppData, latestAssessment } from "@/data/store";
import {
  PageHeader,
  DemoNotice,
  Go,
  EmptyState,
  InputSummary,
  SectionTitle,
  StatusBadge,
} from "@/components/shared";
import ReviewForm from "./ReviewForm";
import { ExplanationChart } from "../explainability/charts";
export default function PatientReview() {
  const { patientId } = useParams({ strict: false });
  const data = useAppData();
  const assessment = latestAssessment(data, patientId || "");
  const patient = data.patients.find((p) => p.id === patientId);
  if (!patient || !assessment)
    return (
      <EmptyState
        title="No assessment to review"
        detail="Create an assessment for this patient first."
        action={<Go to="/patients">Patients</Go>}
      />
    );
  return (
    <>
      <PageHeader
        title="Review Assessment"
        subtitle={`${patient.name} · ${assessment.id.toUpperCase()}`}
        back={`/patients/${patient.id}`}
        action={<StatusBadge status={assessment.status} />}
      />
      <DemoNotice />
      <div className="two-column">
        <section className="panel">
          <SectionTitle title="Available Inputs" />
          <div className="panel-body">
            <InputSummary inputs={assessment.inputs} />
          </div>
        </section>
        <div className="stack">
          <section className="panel">
            <SectionTitle title="Explanation" />
            <div className="panel-body">
              <ExplanationChart result={assessment.result} />
            </div>
          </section>
          <section className="panel">
            <SectionTitle title="Doctor Review & Follow-up" />
            <ReviewForm key={assessment.id} assessment={assessment} />
          </section>
        </div>
      </div>
    </>
  );
}
