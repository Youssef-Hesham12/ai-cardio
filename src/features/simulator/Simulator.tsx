import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useAppData, mockRequest } from "@/data/store";
import { DEMO_simulateAssessment } from "@/data/mockData";
import type { AssessmentInput } from "@/data/mockData";
import {
  PageHeader,
  DemoNotice,
  Go,
  EmptyState,
  SectionTitle,
  InputSummary,
  RiskBadge,
  useAction,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { chartTick, tooltipStyle } from "../explainability/charts";
function Scenario({
  baseline,
  unavailable,
}: {
  baseline: AssessmentInput;
  unavailable: boolean;
}) {
  const [inputs, setInputs] = useState<AssessmentInput>({ ...baseline });
  const { run, pending } = useAction();
  const original = DEMO_simulateAssessment(baseline);
  const simulated = DEMO_simulateAssessment(inputs);
  const setValue = <K extends keyof AssessmentInput>(
    key: K,
    value: AssessmentInput[K],
  ) => setInputs((current) => ({ ...current, [key]: value }));
  return (
    <>
      <div className="equal-columns">
        <section className="panel">
          <SectionTitle
            title="Original Inputs"
            subtitle="Baseline assessment remains unchanged"
          />
          <div className="panel-body">
            <InputSummary inputs={baseline} />
            <div className="score-display">
              {original.score}
              <small> baseline points</small>
            </div>
            <RiskBadge risk={original.riskLevel} />
          </div>
        </section>
        <section className="panel">
          <SectionTitle title="Modified Inputs" subtitle="scenario controls" />
          <div className="panel-body">
            <div className="stack">
              {[
                {
                  key: "age" as const,
                  label: "Age",
                  min: 18,
                  max: 100,
                  unit: "years",
                },
                {
                  key: "systolicBP" as const,
                  label: "Systolic blood pressure",
                  min: 80,
                  max: 250,
                  unit: "mmHg",
                },
                {
                  key: "cholesterol" as const,
                  label: "Total cholesterol",
                  min: 100,
                  max: 400,
                  unit: "mg/dL",
                },
              ].map((item) => (
                <div className="field" key={item.key}>
                  <div className="flex justify-between">
                    <label htmlFor={`scenario-${item.key}`}>{item.label}</label>
                    <strong>
                      {inputs[item.key]} {item.unit}
                    </strong>
                  </div>
                  <input
                    id={`scenario-${item.key}`}
                    type="range"
                    min={item.min}
                    max={item.max}
                    value={inputs[item.key]}
                    onChange={(e) => setValue(item.key, Number(e.target.value))}
                    disabled={unavailable}
                  />
                </div>
              ))}
              <div className="field">
                <label htmlFor="scenario-sex">Sex</label>
                <select
                  id="scenario-sex"
                  disabled={unavailable}
                  value={inputs.sex}
                  onChange={(e) =>
                    setValue("sex", e.target.value as "Male" | "Female")
                  }
                >
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
              <div className="actions">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={inputs.smoking}
                    disabled={unavailable}
                    onChange={(e) => setValue("smoking", e.target.checked)}
                  />
                  Current smoker
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={inputs.diabetes}
                    disabled={unavailable}
                    onChange={(e) => setValue("diabetes", e.target.checked)}
                  />
                  Diabetes history
                </label>
              </div>
            </div>
            <div className="form-actions">
              <Button
                variant="outline"
                onClick={() => setInputs({ ...baseline })}
              >
                <RotateCcw size={15} />
                Reset scenario
              </Button>
              <Button
                disabled={pending || unavailable}
                onClick={() =>
                  run(
                    () => mockRequest(() => undefined, true),
                    "Scenario recalculated.",
                  )
                }
              >
                Recalculate
              </Button>
            </div>
          </div>
        </section>
      </div>
      <section className="panel mt-5">
        <SectionTitle
          title="Score Comparison"
          subtitle="Live scenario preview · never saved to the patient record"
        />
        <div className="equal-columns panel-body">
          <div>
            <div className="score-display">
              {unavailable ? "--" : simulated.score}
              <small> simulated points</small>
            </div>
            {!unavailable && <RiskBadge risk={simulated.riskLevel} />}
            <p className="muted text-xs mt-4">
              Difference from recalculated baseline:{" "}
              {simulated.score - original.score > 0 ? "+" : ""}
              {simulated.score - original.score} points. Baseline inputs are
              recalculated using 2.0; historical model outputs may differ.
            </p>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={
                  unavailable
                    ? []
                    : [
                        { name: "Baseline", points: original.score },
                        { name: "Scenario", points: simulated.score },
                      ]
                }
                margin={{ left: -20 }}
              >
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={chartTick}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={chartTick}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  isAnimationActive={false}
                  dataKey="points"
                  radius={4}
                  barSize={48}
                >
                  <Cell fill="#7c8ba5" />
                  <Cell fill="#578cff" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </>
  );
}
export default function Simulator() {
  const { assessmentId } = useParams({ strict: false });
  const data = useAppData();
  const assessment = data.assessments.find((a) => a.id === assessmentId);
  const patient = data.patients.find((p) => p.id === assessment?.patientId);
  if (!assessment)
    return (
      <EmptyState
        title="Assessment not found"
        action={<Go to="/assessments">Assessments</Go>}
      />
    );
  return (
    <>
      <PageHeader
        title="What-if Scenario Simulator"
        subtitle={`${patient?.name} · ${assessment.id.toUpperCase()} · Scenario analysis`}
        back={`/assessments/${assessment.id}`}
      />
      <DemoNotice scenario />
      {data.preferences.modelUnavailable && (
        <div className="demo-notice">
          The simulator is unavailable. Enable it in Settings to continue.
        </div>
      )}
      <Scenario
        key={assessment.id}
        baseline={assessment.inputs}
        unavailable={data.preferences.modelUnavailable}
      />
    </>
  );
}
