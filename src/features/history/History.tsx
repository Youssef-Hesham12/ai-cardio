import { workspaceText } from "@/lib/workspace-copy";
import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useAppData, patientAssessments } from "@/data/store";
import {
  PageHeader,
  Go,
  date,
  DemoNotice,
  SectionTitle,
  EmptyState,
  RiskBadge,
  StatusBadge,
  inputLabels,
  ActivityTimeline,
} from "@/components/shared";
import { chartTick, tooltipStyle } from "../explainability/charts";
import type { AssessmentInput } from "@/data/mockData";
export default function History() {
  const { patientId } = useParams({ strict: false });
  const data = useAppData();
  const patient = data.patients.find((p) => p.id === patientId);
  const all = patientAssessments(data, patientId || "");
  const [range, setRange] = useState("all");
  const [first, setFirst] = useState(all[1]?.id || "");
  const [second, setSecond] = useState(all[0]?.id || "");
  if (!patient)
    return (
      <EmptyState
        title="Patient not found"
        action={<Go to="/patients">Patients</Go>}
      />
    );
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(range));
  const rows = all.filter((a) => range === "all" || new Date(a.date) >= cutoff);
  const chronological = [...rows].reverse();
  const a = rows.find((item) => item.id === first);
  const b = rows.find((item) => item.id === second);
  const monthly = Array.from(
    new Set(chronological.map((item) => item.date.slice(0, 7))),
  ).map((month) => ({
    name: new Intl.DateTimeFormat("en", { month: "short" }).format(
      new Date(`${month}-01`),
    ),
    count: rows.filter((item) => item.date.startsWith(month)).length,
  }));
  const formatValue = (value: unknown) =>
    typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <>
      <PageHeader
        title="Assessment History"
        subtitle={`${workspaceText(patient.name)} · Assessment history`}
        back={`/patients/${patient.id}`}
        action={
          <select
            aria-label="History date range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="all">All time</option>
            <option value="90">Last 90 days</option>
            <option value="30">Last 30 days</option>
          </select>
        }
      />
      <DemoNotice />
      {!rows.length ? (
        <EmptyState title="No assessments in this date range" />
      ) : (
        <>
          <div className="equal-columns">
            <section className="panel">
              <SectionTitle
                title="Score Trend"
                subtitle="points; not medically calibrated"
              />
              <div className="panel-body">
                <div className="chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chronological.map((item) => ({
                        name: date(item.date),
                        score: item.result.score,
                      }))}
                      margin={{ left: -25, right: 20 }}
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
                      <Line
                        isAnimationActive={false}
                        dataKey="score"
                        name="Score points"
                        stroke="#578cff"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
            <section className="panel">
              <SectionTitle
                title="Assessment Frequency"
                subtitle="Assessment records by month"
              />
              <div className="panel-body">
                <div className="chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthly} margin={{ left: -25, right: 20 }}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={chartTick}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={chartTick}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar
                        isAnimationActive={false}
                        dataKey="count"
                        name="Assessments"
                        fill="#65bba3"
                        radius={4}
                        barSize={32}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </div>
          <section className="panel mt-5">
            <SectionTitle
              title="Compare Assessments"
              subtitle="Select two different assessment records"
            />
            <div className="panel-body">
              <div className="form-grid">
                {[
                  {
                    value: first,
                    change: setFirst,
                    label: "Earlier assessment",
                  },
                  {
                    value: second,
                    change: setSecond,
                    label: "Comparison assessment",
                  },
                ].map((item) => (
                  <div className="field" key={item.label}>
                    <label>{item.label}</label>
                    <select
                      aria-label={item.label}
                      value={item.value}
                      onChange={(e) => item.change(e.target.value)}
                    >
                      <option value="">Select assessment</option>
                      {rows.map((row) => (
                        <option key={row.id} value={row.id}>
                          {date(row.date)} · {row.id}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {a && b && a.id !== b.id ? (
                <>
                  {a.result.modelVersion !== b.result.modelVersion && (
                    <div className="demo-notice mt-5">
                      Model versions differ. Direct score comparison may be
                      invalid.
                    </div>
                  )}
                  <div className="table-scroll mt-5">
                    <table>
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>{a.id.toUpperCase()}</th>
                          <th>{b.id.toUpperCase()}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Date</td>
                          <td>{date(a.date)}</td>
                          <td>{date(b.date)}</td>
                        </tr>
                        <tr>
                          <td>Version</td>
                          <td>{workspaceText(a.result.modelVersion)}</td>
                          <td>{workspaceText(b.result.modelVersion)}</td>
                        </tr>
                        <tr>
                          <td>Assessment score</td>
                          <td>{a.result.score} points</td>
                          <td>{b.result.score} points</td>
                        </tr>
                        <tr>
                          <td>classification</td>
                          <td>
                            <RiskBadge risk={a.result.riskLevel} />
                          </td>
                          <td>
                            <RiskBadge risk={b.result.riskLevel} />
                          </td>
                        </tr>
                        {(
                          Object.keys(inputLabels) as (keyof AssessmentInput)[]
                        ).map((key) => (
                          <tr key={key}>
                            <td>{inputLabels[key]}</td>
                            <td>{formatValue(a.inputs[key])}</td>
                            <td>{formatValue(b.inputs[key])}</td>
                          </tr>
                        ))}
                        {a.result.contributions.map((item) => (
                          <tr key={item.feature}>
                            <td>{item.feature} contribution</td>
                            <td>{item.value} pts</td>
                            <td>
                              {b.result.contributions.find(
                                (c) => c.feature === item.feature,
                              )?.value ?? "Unavailable"}{" "}
                              pts
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="muted text-xs mt-5">
                  Select two distinct assessments to compare their inputs and
                  outputs.
                </p>
              )}
            </div>
          </section>
          <section className="panel mt-5">
            <SectionTitle title="Assessment Timeline" />
            <div className="review-list">
              {rows.map((item) => (
                <div className="review-item" key={item.id}>
                  <div>
                    <strong>{date(item.date, true)}</strong>
                    <p>
                      {item.id.toUpperCase()} ·{" "}
                      {workspaceText(item.result.modelVersion)}
                    </p>
                  </div>
                  <RiskBadge risk={item.result.riskLevel} />
                  <StatusBadge status={item.status} />
                  <Go to={`/assessments/${item.id}`}>Open</Go>
                </div>
              ))}
            </div>
          </section>
          <section className="panel mt-5">
            <SectionTitle title="Doctor Review Events" />
            <ActivityTimeline
              events={data.activities.filter(
                (e) =>
                  e.patientId === patient.id &&
                  /review|information/i.test(e.title),
              )}
            />
          </section>
        </>
      )}
    </>
  );
}
