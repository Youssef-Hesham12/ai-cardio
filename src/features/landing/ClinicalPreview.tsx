import { useRef, useState, type KeyboardEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CircleCheck, FileText } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
const factors = [
  { name: "Age", value: 12, label: "+12" },
  { name: "Cholesterol", value: 10, label: "+10" },
  { name: "Blood pressure", value: 8, label: "+8" },
  { name: "Activity", value: -4, label: "-4" },
];
export default function ClinicalPreview({
  destination,
}: {
  destination: "/login" | "/dashboard" | "/admin";
}) {
  const [mode, setMode] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const changeTab = (event: KeyboardEvent<HTMLButtonElement>) => {
    let next = mode;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight")
      next = 1 - mode;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 1;
    else return;
    event.preventDefault();
    setMode(next);
    tabs.current[next]?.focus();
  };
  return (
    <section
      className="clinical-preview"
      aria-label="Clinical intelligence preview"
    >
      <header className="clinical-preview-header">
        <div>
          <span className="clinical-overline">CLINICAL INTELLIGENCE</span>
          <h3>Assessment overview</h3>
        </div>
        <span className="clinical-demo-label">
          <FileText size={13} />
          Assessment preview
        </span>
      </header>
      <div className="clinical-patient">
        <span className="clinical-patient-mark">PT</span>
        <div>
          <strong>Patient overview</strong>
          <span>Age / 52 years</span>
        </div>
        <span className="clinical-record-id">CA-001</span>
      </div>
      <div
        className="clinical-tabs"
        role="tablist"
        aria-label="Assessment preview views"
      >
        {["Overview", "Factors"].map((label, index) => (
          <button
            key={label}
            id={`clinical-tab-${index}`}
            role="tab"
            aria-selected={mode === index}
            aria-controls={`clinical-panel-${index}`}
            tabIndex={mode === index ? 0 : -1}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            onClick={() => setMode(index)}
            onKeyDown={changeTab}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="clinical-panel"
        role="tabpanel"
        id={`clinical-panel-${mode}`}
        aria-labelledby={`clinical-tab-${mode}`}
        tabIndex={0}
      >
        {mode === 0 ? (
          <>
            <div className="clinical-summary">
              <div
                className="clinical-gauge"
                role="img"
                aria-label="Assessment score 42 out of 100, moderate category"
              >
                <PieChart width={142} height={142}>
                  <Pie
                    data={[{ value: 42 }, { value: 58 }]}
                    dataKey="value"
                    innerRadius={58}
                    outerRadius={65}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    <Cell fill="var(--p-teal)" />
                    <Cell fill="var(--p-line)" />
                  </Pie>
                </PieChart>
                <div>
                  <strong>
                    42<small>/100</small>
                  </strong>
                  <span>Assessment score</span>
                </div>
              </div>
              <div className="clinical-score-copy">
                <span className="clinical-moderate">Moderate</span>
                <h4>A result with context.</h4>
                <p>
                  Example score, not a probability
                  <br />
                  or a medical conclusion.
                </p>
              </div>
            </div>
            <dl className="clinical-inputs">
              <div>
                <dt>Blood pressure</dt>
                <dd>
                  148/92 <small>mmHg</small>
                </dd>
              </div>
              <div>
                <dt>Cholesterol</dt>
                <dd>
                  242 <small>mg/dL</small>
                </dd>
              </div>
              <div>
                <dt>Review status</dt>
                <dd className="clinical-review-status">
                  <CircleCheck size={14} />
                  Awaiting review
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <div className="clinical-factor-view">
            <div className="clinical-factor-heading">
              <strong>Behind the example score</strong>
              <span>contribution points</span>
            </div>
            {factors.map((factor) => (
              <div className="clinical-factor" key={factor.name}>
                <div>
                  <span>{factor.name}</span>
                  <strong>{factor.label}</strong>
                </div>
                <div className="clinical-factor-track">
                  <span
                    style={{
                      width: `${(Math.abs(factor.value) / 12) * 100}%`,
                      background:
                        factor.value < 0
                          ? "var(--p-positive)"
                          : "var(--p-teal)",
                    }}
                  />
                </div>
              </div>
            ))}
            <p>Feature contributions are not clinically validated.</p>
          </div>
        )}
      </div>
      <footer className="clinical-preview-footer">
        <span>
          <FileText size={14} />
          Not for clinical use
        </span>
        <Link to={destination} aria-label="Open the doctor workspace">
          Open workspace
          <ArrowUpRight size={14} />
        </Link>
      </footer>
    </section>
  );
}
