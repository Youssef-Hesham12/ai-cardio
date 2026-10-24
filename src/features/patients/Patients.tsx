import { workspaceText } from "@/lib/workspace-copy";
import { useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import {
  ArrowDownUp,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { useAppData, latestAssessment } from "@/data/store";
import {
  PageHeader,
  SearchInput,
  Avatar,
  RiskBadge,
  StatusBadge,
  date,
  EmptyState,
  Go,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
export default function Patients() {
  const data = useAppData();
  const routeSearch = useSearch({ strict: false }) as {
    risk?: string;
    status?: string;
  };
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState(routeSearch.risk || "All");
  const [status, setStatus] = useState(routeSearch.status || "All");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("updated");
  const patients = data.patients
    .map((patient) => ({
      patient,
      assessment: latestAssessment(data, patient.id),
    }))
    .filter(
      ({ patient: p, assessment: a }) =>
        `${workspaceText(p.name)} ${p.mrn}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (risk === "All" ||
          a?.result.riskLevel === risk ||
          (risk === "Unknown" && !a)) &&
        (status === "All" || a?.status === status),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.patient.name.localeCompare(b.patient.name)
        : sort === "age"
          ? b.patient.age - a.patient.age
          : (b.patient.updatedAt || b.patient.lastVisit).localeCompare(
              a.patient.updatedAt || a.patient.lastVisit,
            ),
    );
  const pages = Math.max(1, Math.ceil(patients.length / 8));
  const current = Math.min(page, pages);
  return (
    <>
      <PageHeader
        title="Patients"
        subtitle="Manage your connected patients and their assessment records."
        action={
          <Go to="/requests">
            <UserRoundPlus size={16} />
            Patient requests
          </Go>
        }
      />
      <div className="filter-bar">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <select
          aria-label="Filter risk"
          value={risk}
          onChange={(e) => {
            setRisk(e.target.value);
            setPage(1);
          }}
        >
          <option value="All">All risk levels</option>
          <option value="Low">Low</option>
          <option value="Moderate">Medium</option>
          <option>High</option>
          <option>Unknown</option>
        </select>
        <select
          aria-label="Filter review status"
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
        <select
          aria-label="Sort patients"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="updated">Last updated</option>
          <option value="name">Name A-Z</option>
          <option value="age">Age descending</option>
        </select>
      </div>
      <section className="panel">
        <div className="section-title">
          <h2 className="flex items-center gap-2">
            <Users size={18} />
            Patient directory
          </h2>
          <span className="muted text-xs">{patients.length} patients</span>
        </div>
        {patients.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    <button
                      className="flex items-center gap-2"
                      onClick={() =>
                        setSort(sort === "name" ? "updated" : "name")
                      }
                    >
                      Patient
                      <ArrowDownUp size={12} />
                    </button>
                  </th>
                  <th>Age / Sex</th>
                  <th>Latest assessment</th>
                  <th>classification</th>
                  <th>Review status</th>
                  <th>Last updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {patients
                  .slice((current - 1) * 8, current * 8)
                  .map(({ patient: p, assessment: a }) => (
                    <tr key={p.id}>
                      <td>
                        <Link
                          to="/patients/$patientId"
                          params={{ patientId: p.id }}
                          className="patient-cell"
                        >
                          <Avatar name={workspaceText(p.name)} />
                          <div>
                            <strong>{workspaceText(p.name)}</strong>
                            <small>{p.mrn}</small>
                          </div>
                        </Link>
                      </td>
                      <td>
                        {p.age} / {p.sex}
                      </td>
                      <td>
                        {a ? (
                          <Link
                            to="/assessments/$assessmentId"
                            params={{ assessmentId: a.id }}
                            className="text-primary"
                          >
                            {a.id.toUpperCase()}
                          </Link>
                        ) : (
                          <span className="muted">Not assessed</span>
                        )}
                      </td>
                      <td>
                        <RiskBadge risk={a?.result.riskLevel} />
                      </td>
                      <td>
                        <StatusBadge status={a?.status} />
                      </td>
                      <td className="muted nowrap">
                        {date(p.updatedAt || p.lastVisit)}
                      </td>
                      <td>
                        <Link
                          to="/patients/$patientId"
                          params={{ patientId: p.id }}
                          className="row-arrow"
                          aria-label={`Open ${workspaceText(p.name)}`}
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
          <EmptyState
            title="No matching patients"
            detail="Adjust your filters or check pending patient connection requests."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setRisk("All");
                  setStatus("All");
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}
        <div className="table-footer">
          <span>
            {patients.length
              ? `${(current - 1) * 8 + 1}-${Math.min(current * 8, patients.length)} of ${patients.length}`
              : "0 patients"}
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
              Page {current} of {pages}
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
