import { workspaceText } from "@/lib/workspace-copy";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users,
  ClipboardCheck,
  Clock3,
  TriangleAlert,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { useAppData, latestAssessment } from "@/data/store";
import {
  ActivityTimeline,
  Avatar,
  date,
  RiskBadge,
  StatusBadge,
  SectionTitle,
  SearchInput,
  AssessmentTable,
  EmptyState,
} from "@/components/shared";
import { riskColors, chartTick, tooltipStyle } from "../explainability/charts";

export default function Dashboard() {
  const data = useAppData();
  const [range, setRange] = useState("90");
  const [risk, setRisk] = useState("All");
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const name = (patientId: string) =>
    workspaceText(
      data.patients.find((p) => p.id === patientId)?.name || "Unknown patient",
    );
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(range));
  const assessments = data.assessments
    .filter(
      (a) =>
        (range === "all" || new Date(a.date) >= cutoff) &&
        (risk === "All" || a.result.riskLevel === risk) &&
        (status === "All" || a.status === status) &&
        `${name(a.patientId)} ${data.patients.find((p) => p.id === a.patientId)?.mrn}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const pending = assessments.filter((a) => a.status !== "Reviewed");
  const distribution = ["Low", "Moderate", "High"].map((level) => ({
    name: level === "Moderate" ? "Medium" : level,
    value: assessments.filter((a) => a.result.riskLevel === level).length,
    fill: riskColors[level],
  }));
  const trend = Array.from({ length: 6 }, (_, i) => {
    const end = new Date();
    end.setDate(end.getDate() - (5 - i) * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    return {
      name: new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
      }).format(end),
      total: assessments.filter(
        (a) => new Date(a.date) >= start && new Date(a.date) < end,
      ).length,
    };
  });
  const priority = data.patients
    .map((p) => ({
      patient: p,
      assessment: latestAssessment(data, p.id),
    }))
    .filter((item) =>
      assessments.some((assessment) => assessment.id === item.assessment?.id),
    )
    .sort(
      (a, b) =>
        (b.assessment?.result.score || 0) - (a.assessment?.result.score || 0),
    )
    .slice(0, 5);
  const stats = [
    {
      label: "Total Patients",
      count: data.patients.length,
      icon: Users,
      tone: "",
      detail: "Connected patient records",
      href: "/patients",
    },
    {
      label: "Completed Assessments",
      count: assessments.length,
      icon: ClipboardCheck,
      tone: "green",
      detail: "Completed assessments",
      href: "/assessments",
    },
    {
      label: "Pending Reviews",
      count: pending.length,
      icon: Clock3,
      tone: "amber",
      detail: "Awaiting your review",
      href: "/assessments?status=Pending",
    },
    {
      label: "High Risk Assessments",
      count: assessments.filter((a) => a.result.riskLevel === "High").length,
      icon: TriangleAlert,
      tone: "red",
      detail: "Assessment classifications",
      href: "/assessments?risk=High",
    },
  ];
  return (
    <>
      <div className="welcome-line">
        <div className="welcome">
          <h1>
            <span>Welcome Back,</span> {data.doctor.name}
          </h1>
          <p>Your patient overview, assessments, and reviews in one place.</p>
        </div>
      </div>
      <div className="stat-grid">
        {stats.map((stat) => (
          <Link to={stat.href} key={stat.label} className="stat-card">
            <span className={`stat-icon ${stat.tone}`}>
              <stat.icon size={21} />
            </span>
            <div>
              <p>{stat.label}</p>
              <strong>{stat.count}</strong>
              <small>{stat.detail}</small>
            </div>
          </Link>
        ))}
      </div>
      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} />
        <select
          aria-label="Date range"
          value={range}
          onChange={(e) => setRange(e.target.value)}
        >
          <option value="90">Last 90 days</option>
          <option value="30">Last 30 days</option>
          <option value="7">Last 7 days</option>
          <option value="all">All time</option>
        </select>
        <select
          aria-label="Risk category"
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
        >
          <option>All</option>
          <option value="Low">Low risk</option>
          <option value="Moderate">Medium risk</option>
          <option value="High">High risk</option>
        </select>
        <select
          aria-label="Review status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option>All</option>
          <option>Pending</option>
          <option>Reviewed</option>
          <option>Needs Info</option>
        </select>
      </div>
      <div className="dashboard-grid">
        <div className="stack">
          <section className="panel">
            <SectionTitle
              title="Assessment Overview"
              subtitle="Assessments submitted over the last six weeks"
              action={
                <span className="badge status-reviewed">
                  <CalendarDays size={12} />
                  Weekly
                </span>
              }
            />
            <div className="panel-body">
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trend}
                    margin={{ left: -24, right: 12, top: 10, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={chartTick}
                      axisLine={false}
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={chartTick}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      isAnimationActive={false}
                      dataKey="total"
                      name="Assessments"
                      type="monotone"
                      stroke="#578cff"
                      fill="#578cff"
                      fillOpacity={0.12}
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="chart-legend">
              <span>
                <i className="legend-dot" style={{ background: "#578cff" }} />
                Completed assessments
              </span>
            </div>
          </section>
          <section className="panel">
            <SectionTitle
              title="Priority Patients"
              subtitle="Organized by assessment score; not clinical triage"
              action={
                <Link to="/patients">
                  View all
                  <ArrowRight size={14} />
                </Link>
              }
            />
            {priority.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Classification</th>
                      <th>Review status</th>
                      <th>Last updated</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {priority.map(({ patient, assessment }) => (
                      <tr key={patient.id}>
                        <td>
                          <Link
                            to="/patients/$patientId"
                            params={{ patientId: patient.id }}
                            className="patient-cell"
                          >
                            <Avatar name={workspaceText(patient.name)} />
                            <div>
                              <strong>{workspaceText(patient.name)}</strong>
                              <small>{patient.mrn}</small>
                            </div>
                          </Link>
                        </td>
                        <td>
                          <RiskBadge risk={assessment?.result.riskLevel} />
                        </td>
                        <td>
                          <StatusBadge status={assessment?.status} />
                        </td>
                        <td className="muted nowrap">
                          {date(assessment!.date)}
                        </td>
                        <td>
                          <Link
                            to="/patients/$patientId"
                            params={{ patientId: patient.id }}
                            className="row-arrow"
                            aria-label={`View ${workspaceText(patient.name)}`}
                          >
                            <ArrowRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No matching patients" />
            )}
          </section>
          <section className="panel">
            <SectionTitle
              title="Recent Assessments"
              subtitle="Latest connected patient submissions"
              action={
                <Link to="/assessments">
                  View all
                  <ArrowRight size={14} />
                </Link>
              }
            />
            <AssessmentTable
              assessments={assessments.slice(0, 4)}
              patientName={name}
            />
          </section>
        </div>
        <div className="stack">
          <section className="panel">
            <SectionTitle
              title="Risk Distribution"
              subtitle="Assessment categories"
            />
            <div className="risk-chart">
              {assessments.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      isAnimationActive={false}
                      data={distribution}
                      dataKey="value"
                      innerRadius={58}
                      outerRadius={76}
                      paddingAngle={5}
                      stroke="none"
                    >
                      {distribution.map((item) => (
                        <Cell key={item.name} fill={item.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
              <div className="donut-label">
                <strong>{assessments.length}</strong>
                <small>Assessments</small>
              </div>
            </div>
            <div className="risk-key">
              {distribution.map((item) => (
                <div key={item.name}>
                  <span className="patient-cell">
                    <i
                      className="legend-dot"
                      style={{ background: item.fill }}
                    />
                    <span className="muted">{item.name} risk</span>
                  </span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <SectionTitle
              title="Pending Reviews"
              subtitle={`${pending.length} assessments need attention`}
              action={
                <Link to="/assessments" search={{ status: "Pending" }}>
                  View all
                  <ArrowRight size={14} />
                </Link>
              }
            />
            <div className="review-list">
              {pending.slice(0, 3).map((a) => (
                <Link
                  to="/assessments/$assessmentId"
                  params={{ assessmentId: a.id }}
                  className="review-item"
                  key={a.id}
                >
                  <Avatar name={name(a.patientId)} />
                  <div>
                    <strong>{name(a.patientId)}</strong>
                    <p>
                      {date(a.date)} · {a.source || "Doctor"}
                    </p>
                  </div>
                  <ArrowRight size={15} className="muted" />
                </Link>
              ))}
              {!pending.length && (
                <EmptyState
                  title="You're all caught up"
                  detail="No outstanding reviews in this view."
                />
              )}
            </div>
          </section>
          <section className="panel">
            <SectionTitle
              title="Review Status"
              subtitle="Current filtered assessments"
            />
            <div className="panel-body">
              <div className="chart" style={{ height: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={["Reviewed", "Pending", "Needs Info"].map((s) => ({
                      name: s,
                      count: assessments.filter((a) => a.status === s).length,
                    }))}
                    layout="vertical"
                    margin={{ left: 0, right: 20 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      tick={chartTick}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      isAnimationActive={false}
                      dataKey="count"
                      name="Assessments"
                      fill="#578cff"
                      radius={3}
                      barSize={12}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
          <section className="panel">
            <SectionTitle
              title="Recent Activity"
              subtitle="Your connected workspace"
            />
            <ActivityTimeline events={data.activities.slice(0, 3)} />
          </section>
        </div>
      </div>
    </>
  );
}
