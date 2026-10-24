import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ClipboardCheck,
  Clock3,
  ScrollText,
  Settings2,
  ShieldCheck,
  Stethoscope,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { Avatar, date, Go, PageHeader } from "@/components/shared";
import { useAdminData } from "@/data/accounts";
import { getDoctorWorkspaceStats, useAppData } from "@/data/store";

export default function AdminOverview() {
  const data = useAdminData();
  useAppData();
  const stats = data.doctors.map((doctor) =>
    getDoctorWorkspaceStats(doctor.id),
  );
  const active = data.doctors.filter(
    (doctor) => doctor.status === "Active",
  ).length;
  const metrics = [
    {
      label: "Doctor accounts",
      value: data.doctors.length,
      detail: `${active} active accounts`,
      icon: Stethoscope,
      color: "blue",
    },
    {
      label: "Connected patients",
      value: stats.reduce((sum, item) => sum + item.patients, 0),
      detail: "Across doctor workspaces",
      icon: Users,
      color: "green",
    },
    {
      label: "Assessments",
      value: stats.reduce((sum, item) => sum + item.assessments, 0),
      detail: "Saved assessment records",
      icon: ClipboardCheck,
      color: "blue",
    },
    {
      label: "Pending connections",
      value: stats.reduce((sum, item) => sum + item.pendingRequests, 0),
      detail: "Awaiting doctor response",
      icon: Clock3,
      color: "amber",
    },
  ];
  return (
    <>
      <PageHeader
        title="System overview"
        subtitle={`${data.settings.organization} / Administration`}
        action={
          <Go to="/admin/doctors?create=true" primary>
            <UserRoundPlus size={16} />
            Create doctor
          </Go>
        }
      />
      <div className="admin-metrics">
        {metrics.map((metric) => (
          <article className="admin-metric" key={metric.label}>
            <span className={`admin-metric-icon ${metric.color}`}>
              <metric.icon size={21} />
            </span>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </article>
        ))}
      </div>
      <div className="admin-overview-grid">
        <section className="admin-section">
          <div className="admin-section-heading">
            <div>
              <h2>Doctor directory</h2>
              <p>Accounts and access across your organization</p>
            </div>
            <Link to="/admin/doctors">
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="table-scroll admin-directory-preview">
            <table>
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Specialty</th>
                  <th>Access</th>
                  <th>
                    <span className="sr-only">Manage doctor</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.doctors.slice(0, 5).map((doctor) => (
                  <tr key={doctor.id}>
                    <td>
                      <span className="patient-cell">
                        <Avatar name={doctor.name} />
                        <span>
                          <strong>{doctor.name}</strong>
                          <small>{doctor.email}</small>
                        </span>
                      </span>
                    </td>
                    <td>{doctor.specialty}</td>
                    <td>
                      <span
                        className={`badge ${doctor.status === "Active" ? "status-accepted" : "status-pending"}`}
                      >
                        <span className="badge-dot" />
                        {doctor.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        to="/admin/doctors"
                        className="row-arrow"
                        aria-label={`Manage ${doctor.name}`}
                        title={`Manage ${doctor.name}`}
                      >
                        <ArrowRight size={17} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="admin-section admin-access-section">
          <div className="admin-section-heading">
            <div>
              <h2>Account access</h2>
              <p>Doctor account distribution</p>
            </div>
            <ShieldCheck size={19} />
          </div>
          <div className="admin-account-total">
            <strong>
              {active}
              <span> / {data.doctors.length}</span>
            </strong>
            <p>Active doctor accounts</p>
          </div>
          <div
            className="admin-access-bar"
            role="img"
            aria-label={`${active} active and ${data.doctors.length - active} suspended doctors`}
          >
            <span
              style={{
                width: `${data.doctors.length ? (active / data.doctors.length) * 100 : 0}%`,
              }}
            />
          </div>
          <dl className="admin-access-key">
            <div>
              <dt>
                <i className="admin-key-dot active" />
                Active
              </dt>
              <dd>{active}</dd>
            </div>
            <div>
              <dt>
                <i className="admin-key-dot suspended" />
                Suspended
              </dt>
              <dd>{data.doctors.length - active}</dd>
            </div>
          </dl>
          <div className="admin-access-controls">
            <h3>Access controls</h3>
            <div>
              <span>Doctor sign-in</span>
              <b
                className={
                  data.settings.doctorAccessEnabled
                    ? "admin-text-green"
                    : "admin-text-amber"
                }
              >
                {data.settings.doctorAccessEnabled ? "Enabled" : "Disabled"}
              </b>
            </div>
            <div>
              <span>New patient requests</span>
              <b
                className={
                  data.settings.patientConnectionsEnabled
                    ? "admin-text-green"
                    : "admin-text-amber"
                }
              >
                {data.settings.patientConnectionsEnabled
                  ? "Enabled"
                  : "Disabled"}
              </b>
            </div>
            <Link to="/admin/settings">
              <Settings2 size={14} />
              Manage system settings
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </div>
      <section className="admin-section admin-recent-activity">
        <div className="admin-section-heading">
          <div>
            <h2>Recent activity</h2>
            <p>Administrative changes and account updates</p>
          </div>
          <Link to="/admin/activity">
            Full activity log
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="admin-activity-list">
          {data.events.slice(0, 4).map((event) => (
            <div key={event.id}>
              <span className="admin-event-icon">
                <ScrollText size={17} />
              </span>
              <div>
                <strong>{event.action}</strong>
                <p>
                  {event.detail} / {event.actor}
                </p>
              </div>
              <time dateTime={event.date}>{date(event.date, true)}</time>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
