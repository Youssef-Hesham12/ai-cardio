import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleAlert, Database, Save, ShieldCheck } from "lucide-react";
import { Modal, PageHeader, useToast } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  saveSystemSettings,
  useAdminData,
  type SystemSettings,
} from "@/data/accounts";

const schema = z.object({
  organization: z
    .string()
    .trim()
    .min(2, "Enter an organization name.")
    .max(100),
  supportEmail: z.email("Enter a valid support email."),
  doctorAccessEnabled: z.boolean(),
  patientConnectionsEnabled: z.boolean(),
});
export default function AdminSettings() {
  const data = useAdminData();
  const toast = useToast();
  const [confirmation, setConfirmation] = useState<SystemSettings | null>(null);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SystemSettings>({
    resolver: zodResolver(schema),
    defaultValues: data.settings,
  });
  const save = (values: SystemSettings) => {
    setError("");
    try {
      saveSystemSettings(values);
      reset(values);
      setConfirmation(null);
      toast("System settings saved.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to save system settings.",
      );
    }
  };
  return (
    <>
      <PageHeader
        title="System settings"
        subtitle="Organization details and platform access policies."
      />
      <div className="admin-settings-grid">
        <form
          noValidate
          onSubmit={handleSubmit((values) => {
            if (
              data.settings.doctorAccessEnabled &&
              !values.doctorAccessEnabled
            )
              setConfirmation(values);
            else save(values);
          })}
        >
          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <h2>Organization</h2>
                <p>Workspace identity and contact</p>
              </div>
            </div>
            <div className="form-grid admin-settings-fields">
              <div className="field full">
                <label htmlFor="admin-organization">Organization name</label>
                <input
                  id="admin-organization"
                  {...register("organization")}
                  maxLength={100}
                  aria-invalid={!!errors.organization}
                />
                {errors.organization && (
                  <span className="field-error">
                    {errors.organization.message}
                  </span>
                )}
              </div>
              <div className="field full">
                <label htmlFor="admin-support-email">Support email</label>
                <input
                  id="admin-support-email"
                  type="email"
                  {...register("supportEmail")}
                  maxLength={254}
                  aria-invalid={!!errors.supportEmail}
                />
                {errors.supportEmail && (
                  <span className="field-error">
                    {errors.supportEmail.message}
                  </span>
                )}
              </div>
            </div>
          </section>
          <section className="admin-section admin-policy-section">
            <div className="admin-section-heading">
              <div>
                <h2>Access policies</h2>
                <p>System-wide controls</p>
              </div>
              <ShieldCheck size={19} />
            </div>
            <div className="admin-policy-row">
              <div>
                <h3>Doctor sign-in</h3>
                <p>
                  {
                    data.doctors.filter(
                      (account) => account.status === "Active",
                    ).length
                  }{" "}
                  active doctor accounts
                </p>
              </div>
              <label className="admin-switch">
                <input
                  role="switch"
                  aria-label="Doctor sign-in"
                  type="checkbox"
                  {...register("doctorAccessEnabled")}
                />
                <span className="sr-only">Doctor sign-in</span>
              </label>
            </div>
            <div className="admin-policy-row">
              <div>
                <h3>New patient connection requests</h3>
                <p>Patient-app request intake</p>
              </div>
              <label className="admin-switch">
                <input
                  role="switch"
                  aria-label="New patient connection requests"
                  type="checkbox"
                  {...register("patientConnectionsEnabled")}
                />
                <span className="sr-only">New patient connection requests</span>
              </label>
            </div>
          </section>
          {error && !confirmation && (
            <p className="admin-inline-error" role="alert">
              <CircleAlert size={16} />
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              disabled={!isDirty}
              onClick={() => {
                reset(data.settings);
                setError("");
              }}
            >
              Discard changes
            </Button>
            <Button type="submit" disabled={!isDirty}>
              <Save size={15} />
              Save settings
            </Button>
          </div>
        </form>
        <aside className="admin-settings-aside">
          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <h2>Administrator</h2>
                <p>Account information</p>
              </div>
              <ShieldCheck size={19} />
            </div>
            <dl className="details">
              <div>
                <dt>Name</dt>
                <dd>{data.administrator.name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{data.administrator.email}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>Super Admin</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd className="admin-text-green">Active</dd>
              </div>
            </dl>
          </section>
          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <h2>Workspace storage</h2>
                <p>Current environment</p>
              </div>
              <Database size={19} />
            </div>
            <dl className="details">
              <div>
                <dt>Storage</dt>
                <dd>This browser</dd>
              </div>
              <div>
                <dt>Time zone</dt>
                <dd>Africa/Cairo</dd>
              </div>
              <div>
                <dt>Doctor workspaces</dt>
                <dd>{data.doctors.length}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
      {confirmation && (
        <Modal
          title="Disable doctor sign-in?"
          onClose={() => {
            setConfirmation(null);
            setError("");
          }}
        >
          <p>
            Doctor sessions will be revoked. Doctors will not be able to sign in
            until access is enabled again. Your administrator account remains
            available.
          </p>
          {error && (
            <p className="admin-inline-error" role="alert">
              <CircleAlert size={16} />
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmation(null);
                setError("");
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => save(confirmation)}>
              <ShieldCheck size={15} />
              Disable doctor sign-in
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
