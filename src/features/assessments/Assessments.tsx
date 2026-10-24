import { workspaceText } from "@/lib/workspace-copy";
import { useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAppData } from "@/data/store";
import {
  PageHeader,
  Go,
  AssessmentTable,
  SearchInput,
  EmptyState,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
export default function Assessments({
  reports = false,
}: {
  reports?: boolean;
}) {
  const data = useAppData();
  const searchParams = useSearch({ strict: false }) as {
    risk?: string;
    status?: string;
  };
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState(searchParams.risk || "All");
  const [status, setStatus] = useState(searchParams.status || "All");
  const [page, setPage] = useState(1);
  const patientName = (id: string) =>
    data.patients.find((p) => p.id === id)?.name || "Unknown";
  const rows = data.assessments
    .filter(
      (a) =>
        `${patientName(a.patientId)} ${a.id}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (risk === "All" || risk === a.result.riskLevel) &&
        (status === "All" ||
          status === a.status ||
          (status === "Pending" && a.status === "Needs Info")),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const current = Math.min(page, pages);
  return (
    <>
      <PageHeader
        title={reports ? "Reports" : "Assessments"}
        subtitle={
          reports
            ? "Assessment reports with results, explanations, and doctor notes."
            : "All connected assessments and review statuses."
        }
      />
      <div className="filter-bar">
        <SearchInput
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPage(1);
          }}
          placeholder="Search patient or assessment ID..."
        />
        <select
          value={risk}
          aria-label="Filter risk"
          onChange={(e) => {
            setRisk(e.target.value);
            setPage(1);
          }}
        >
          <option value="All">All risk levels</option>
          <option value="Low">Low</option>
          <option value="Moderate">Medium</option>
          <option>High</option>
        </select>
        <select
          aria-label="Review status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="All">All review statuses</option>
          <option>Pending</option>
          <option>Reviewed</option>
          <option>Needs Info</option>
        </select>
      </div>
      <section className="panel">
        {reports ? (
          rows.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Assessment</th>
                    <th>Version</th>
                    <th>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((current - 1) * 10, current * 10).map((a) => (
                    <tr key={a.id}>
                      <td>{patientName(a.patientId)}</td>
                      <td>{a.id.toUpperCase()}</td>
                      <td className="muted">
                        {workspaceText(a.result.modelVersion)}
                      </td>
                      <td>
                        <Go to={`/reports/${a.id}`}>Report preview</Go>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No matching reports" />
          )
        ) : (
          <AssessmentTable
            assessments={rows.slice((current - 1) * 10, current * 10)}
            patientName={patientName}
          />
        )}
        <div className="table-footer">
          <span>
            {rows.length} {reports ? "reports" : "assessments"}
          </span>
          <div className="actions">
            <Button
              variant="ghost"
              size="icon"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </Button>
            <span>
              {current} / {pages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
