import { useState } from "react";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import { date, EmptyState, PageHeader, SearchInput } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useAdminData } from "@/data/accounts";

export default function AdminActivity() {
  const data = useAdminData();
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("All");
  const [page, setPage] = useState(1);
  const rows = data.events.filter(
    (event) =>
      `${event.action} ${event.detail} ${event.actor}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (action === "All" || event.action === action),
  );
  const pages = Math.max(1, Math.ceil(rows.length / 12));
  const current = Math.min(page, pages);
  return (
    <>
      <PageHeader
        title="Activity log"
        subtitle="Administrative account changes and system updates."
      />
      <div className="filter-bar">
        <SearchInput
          placeholder="Search administrative activity..."
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
        />
        <select
          aria-label="Filter activity type"
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
        >
          <option value="All">All activity types</option>
          {[...new Set(data.events.map((event) => event.action))]
            .sort()
            .map((value) => (
              <option key={value}>{value}</option>
            ))}
        </select>
      </div>
      <section className="admin-directory-table">
        {rows.length ? (
          <div className="table-scroll">
            <table className="admin-audit-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Account / Subject</th>
                  <th>Performed by</th>
                  <th>Date / Cairo</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((current - 1) * 12, current * 12).map((event) => (
                  <tr key={event.id}>
                    <td>
                      <span className="admin-audit-action">
                        <ScrollText size={16} />
                        <strong>{event.action}</strong>
                      </span>
                    </td>
                    <td>{event.detail}</td>
                    <td>{event.actor}</td>
                    <td>
                      <time dateTime={event.date} className="muted nowrap">
                        {date(event.date, true)}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No matching activity"
            detail="No administrative events match these filters."
          />
        )}
        <div className="table-footer">
          <span>
            {rows.length} event{rows.length === 1 ? "" : "s"}
          </span>
          <div className="actions">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Previous page"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <span>
              {current} / {pages}
            </span>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Next page"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
