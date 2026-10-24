import { useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Pencil,
  Save,
  UserRoundCheck,
  UserRoundPlus,
  UserRoundX,
} from "lucide-react";
import {
  Avatar,
  date,
  EmptyState,
  Modal,
  PageHeader,
  SearchInput,
  useToast,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  createDoctorAccount,
  resetDoctorPassword,
  setDoctorStatus,
  updateDoctorAccount,
  useAdminData,
} from "@/data/accounts";
import type { Account } from "@/data/accounts";
import { getDoctorWorkspaceStats } from "@/data/store";

const fields = z.object({
  name: z.string().trim().min(3, "Enter a full name.").max(100),
  email: z.email("Enter a valid email address.").max(254),
  specialty: z.string().trim().min(2, "Enter a specialty.").max(100),
  hospital: z.string().trim().min(2, "Enter an organization.").max(150),
  password: z.string().max(128),
});
type Values = z.infer<typeof fields>;

function DoctorEditor({
  account,
  organization,
  onClose,
  onSaved,
}: {
  account?: Account;
  organization: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  const schema = fields.refine(
    (value) => Boolean(account) || value.password.length >= 8,
    {
      path: ["password"],
      message: "Use a password between 8 and 128 characters.",
    },
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: account?.name || "",
      email: account?.email || "",
      specialty: account?.specialty || "Cardiology",
      hospital: account?.hospital || organization,
      password: "",
    },
  });
  return (
    <Modal
      title={account ? "Edit doctor" : "Create doctor"}
      onClose={() => {
        if (!saving.current) onClose();
      }}
    >
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          if (saving.current) return;
          saving.current = true;
          setPending(true);
          setError("");
          try {
            if (account) {
              updateDoctorAccount(account.id, values);
            } else await createDoctorAccount(values, values.password);
            onSaved();
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : "Unable to save this doctor account.",
            );
          } finally {
            saving.current = false;
            setPending(false);
          }
        })}
      >
        <div className="admin-form-caption">
          <span className="admin-form-avatar">
            <UserRoundPlus size={23} />
          </span>
          <div>
            <strong>
              {account ? "Account details" : "New doctor account"}
            </strong>
            <p>{account ? account.email : "Doctor / Active access"}</p>
          </div>
        </div>
        <div className="form-grid">
          {(
            [
              ["name", "Full name"],
              ["email", "Sign-in email"],
              ["specialty", "Specialty"],
              ["hospital", "Organization"],
            ] as const
          ).map(([key, label]) => (
            <div
              className={`field ${key === "name" || key === "email" ? "full" : ""}`}
              key={key}
            >
              <label htmlFor={`admin-doctor-${key}`}>{label}</label>
              <input
                id={`admin-doctor-${key}`}
                {...register(key)}
                type={key === "email" ? "email" : "text"}
                maxLength={
                  key === "email" ? 254 : key === "hospital" ? 150 : 100
                }
                autoComplete={key === "email" ? "off" : undefined}
                disabled={pending}
                aria-invalid={!!errors[key]}
                aria-describedby={
                  errors[key] ? `admin-${key}-error` : undefined
                }
              />
              {errors[key] && (
                <span className="field-error" id={`admin-${key}-error`}>
                  {errors[key]?.message}
                </span>
              )}
            </div>
          ))}
          {!account && (
            <div className="field full">
              <label htmlFor="admin-doctor-password">Password</label>
              <div className="admin-password-field">
                <input
                  id="admin-doctor-password"
                  {...register("password")}
                  type={visible ? "text" : "password"}
                  autoComplete="new-password"
                  maxLength={128}
                  disabled={pending}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setVisible(!visible)}
                  title={visible ? "Hide password" : "Show password"}
                  aria-label={visible ? "Hide password" : "Show password"}
                >
                  {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && (
                <span className="field-error">{errors.password.message}</span>
              )}
            </div>
          )}
        </div>
        {error && (
          <p className="admin-inline-error" role="alert">
            <CircleAlert size={16} />
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <LoaderCircle className="animate-spin" size={15} />
            ) : (
              <Save size={15} />
            )}
            {account ? "Save changes" : "Create doctor"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordReset({
  account,
  onClose,
}: {
  account: Account;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const toast = useToast();
  return (
    <Modal
      title="Reset doctor password"
      onClose={() => {
        if (!saving.current) onClose();
      }}
    >
      <p>
        {account.name} / {account.email}
      </p>
      <form
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          if (saving.current) return;
          saving.current = true;
          setPending(true);
          setError("");
          try {
            await resetDoctorPassword(account.id, password);
            toast(
              "Doctor password reset. Previous sessions are no longer valid.",
            );
            onClose();
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : "Unable to reset this password.",
            );
          } finally {
            saving.current = false;
            setPending(false);
          }
        }}
      >
        <div className="field">
          <label htmlFor="admin-new-password">New password</label>
          <div className="admin-password-field">
            <input
              id="admin-new-password"
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
            />
            <button
              type="button"
              aria-label={visible ? "Hide password" : "Show password"}
              title={visible ? "Hide password" : "Show password"}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
        {error && (
          <p className="admin-inline-error" role="alert">
            <CircleAlert size={16} />
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <LoaderCircle className="animate-spin" size={15} />
            ) : (
              <KeyRound size={15} />
            )}
            Reset password
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminDoctors() {
  const data = useAdminData();
  const { create } = useSearch({ strict: false }) as { create?: boolean };
  const navigate = useNavigate();
  const toast = useToast();
  const [editor, setEditor] = useState<Account | "create" | null>(
    create ? "create" : null,
  );
  const [passwordAccount, setPasswordAccount] = useState<Account | null>(null);
  const [statusAccount, setStatusAccount] = useState<Account | null>(null);
  const [statusError, setStatusError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [specialty, setSpecialty] = useState("All");
  const [page, setPage] = useState(1);
  const rows = data.doctors
    .filter(
      (doctor) =>
        `${doctor.name} ${doctor.email} ${doctor.hospital}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (status === "All" || doctor.status === status) &&
        (specialty === "All" || doctor.specialty === specialty),
    )
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name),
    );
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const current = Math.min(page, pages);
  const closeEditor = () => {
    setEditor(null);
    if (create)
      void navigate({
        to: "/admin/doctors",
        search: { create: undefined },
        replace: true,
      });
  };
  return (
    <>
      <PageHeader
        title="Doctors"
        subtitle="Manage doctor accounts, credentials, and access."
        action={
          <Button onClick={() => setEditor("create")}>
            <UserRoundPlus size={16} />
            Create doctor
          </Button>
        }
      />
      <div
        className="admin-directory-tabs"
        role="group"
        aria-label="Doctor account status"
      >
        {["All", "Active", "Suspended"].map((value) => (
          <button
            key={value}
            aria-pressed={status === value}
            className={status === value ? "selected" : ""}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
          >
            {value === "All" ? "All doctors" : value}
            <span>
              {
                data.doctors.filter(
                  (doctor) => value === "All" || doctor.status === value,
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="filter-bar admin-doctor-filters">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Search name, email, or organization..."
        />
        <select
          aria-label="Filter specialty"
          value={specialty}
          onChange={(event) => {
            setSpecialty(event.target.value);
            setPage(1);
          }}
        >
          <option value="All">All specialties</option>
          {[...new Set(data.doctors.map((doctor) => doctor.specialty))]
            .sort()
            .map((value) => (
              <option key={value}>{value}</option>
            ))}
        </select>
      </div>
      <section className="admin-directory-table">
        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Specialty / Organization</th>
                  <th>Patients</th>
                  <th>Access</th>
                  <th>Created</th>
                  <th className="admin-actions-heading">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((current - 1) * 10, current * 10).map((doctor) => (
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
                    <td>
                      {doctor.specialty}
                      <small>{doctor.hospital}</small>
                    </td>
                    <td className="admin-number-cell">
                      {getDoctorWorkspaceStats(doctor.id).patients}
                    </td>
                    <td>
                      <span
                        className={`badge ${doctor.status === "Active" ? "status-accepted" : "status-pending"}`}
                      >
                        <span className="badge-dot" />
                        {doctor.status}
                      </span>
                    </td>
                    <td className="muted nowrap">{date(doctor.createdAt)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditor(doctor)}
                          aria-label={`Edit ${doctor.name}`}
                          title={`Edit ${doctor.name}`}
                        >
                          <Pencil size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPasswordAccount(doctor)}
                          aria-label={`Reset password for ${doctor.name}`}
                          title={`Reset password for ${doctor.name}`}
                        >
                          <KeyRound size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={
                            doctor.status === "Active"
                              ? "admin-suspend-action"
                              : "admin-restore-action"
                          }
                          onClick={() => {
                            setStatusError("");
                            setStatusAccount(doctor);
                          }}
                          aria-label={`${doctor.status === "Active" ? "Suspend" : "Restore access for"} ${doctor.name}`}
                          title={
                            doctor.status === "Active"
                              ? "Suspend access"
                              : "Restore access"
                          }
                        >
                          {doctor.status === "Active" ? (
                            <UserRoundX size={16} />
                          ) : (
                            <UserRoundCheck size={16} />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No matching doctors"
            detail="No accounts match the selected filters."
          />
        )}
        <div className="table-footer">
          <span>
            {rows.length} doctor{rows.length !== 1 ? "s" : ""}
          </span>
          <div className="actions">
            <Button
              variant="ghost"
              size="icon"
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
              variant="ghost"
              size="icon"
              aria-label="Next page"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </section>
      {editor && (
        <DoctorEditor
          account={editor === "create" ? undefined : editor}
          organization={data.settings.organization}
          onClose={closeEditor}
          onSaved={() => {
            closeEditor();
            setQuery("");
            setStatus("All");
            setSpecialty("All");
            setPage(1);
            toast(
              editor === "create"
                ? "Doctor account created."
                : "Doctor account updated.",
            );
          }}
        />
      )}
      {passwordAccount && (
        <PasswordReset
          account={passwordAccount}
          onClose={() => setPasswordAccount(null)}
        />
      )}
      {statusAccount && (
        <Modal
          title={
            statusAccount.status === "Active"
              ? "Suspend doctor access?"
              : "Restore doctor access?"
          }
          onClose={() => setStatusAccount(null)}
        >
          <p>
            {statusAccount.status === "Active"
              ? `${statusAccount.name} will no longer be able to sign in. Patient records will be retained.`
              : `${statusAccount.name} will be able to sign in again.`}
          </p>
          {statusError && (
            <p className="admin-inline-error" role="alert">
              <CircleAlert size={16} />
              {statusError}
            </p>
          )}
          <div className="form-actions">
            <Button variant="outline" onClick={() => setStatusAccount(null)}>
              Cancel
            </Button>
            <Button
              variant={
                statusAccount.status === "Active" ? "destructive" : "default"
              }
              onClick={() => {
                try {
                  setDoctorStatus(
                    statusAccount.id,
                    statusAccount.status === "Active" ? "Suspended" : "Active",
                  );
                  setStatusAccount(null);
                  toast("Doctor access updated.");
                } catch (failure) {
                  setStatusError(
                    failure instanceof Error
                      ? failure.message
                      : "Unable to update access.",
                  );
                }
              }}
            >
              {statusAccount.status === "Active" ? (
                <UserRoundX size={15} />
              ) : (
                <UserRoundCheck size={15} />
              )}
              {statusAccount.status === "Active"
                ? "Suspend access"
                : "Restore access"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
