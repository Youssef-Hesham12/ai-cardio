import { workspaceText } from "@/lib/workspace-copy";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, RotateCcw, Moon, Sun } from "lucide-react";
import {
  useAppData,
  updateData,
  resetDemoData,
  mockRequest,
  addEvent,
  getAppData,
} from "@/data/store";
import {
  PageHeader,
  SectionTitle,
  Modal,
  DemoNotice,
  useAction,
  useToast,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
const schema = z.object({
  name: z.string().trim().min(3, "Enter a full name."),
  email: z.email("Enter a valid email."),
  specialty: z.string().trim().min(2),
  hospital: z.string().trim().min(2),
});
type Values = z.infer<typeof schema>;
export default function Settings() {
  const data = useAppData();
  const [confirm, setConfirm] = useState(false);
  const toast = useToast();
  const { pending, run } = useAction();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...data.doctor,
      hospital: workspaceText(data.doctor.hospital),
    },
  });
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, preferences, and workspace settings."
      />
      <div className="equal-columns">
        <div className="stack">
          <section className="panel">
            <SectionTitle
              title="Doctor Profile"
              subtitle="Account information"
            />
            <form
              className="panel-body"
              onSubmit={handleSubmit((values) =>
                run(
                  () =>
                    mockRequest(() =>
                      updateData((d) => {
                        d.doctor = values;
                        addEvent(d, "Doctor profile updated", values.name);
                      }),
                    ),
                  "doctor profile saved.",
                ),
              )}
              noValidate
            >
              <div className="form-grid">
                {(["name", "email", "specialty", "hospital"] as const).map(
                  (key) => (
                    <div className="field" key={key}>
                      <label htmlFor={`doctor-${key}`}>
                        {key === "name"
                          ? "Full name"
                          : key === "email"
                            ? "Profile email"
                            : key === "specialty"
                              ? "Specialty"
                              : "Organization"}
                      </label>
                      <input
                        id={`doctor-${key}`}
                        {...register(key)}
                        aria-invalid={!!errors[key]}
                      />
                      <span className="field-error">
                        {errors[key]?.message}
                      </span>
                    </div>
                  ),
                )}
              </div>
              <div className="form-actions">
                <Button type="submit" disabled={pending}>
                  <Save size={15} />
                  Save profile
                </Button>
              </div>
            </form>
          </section>
          <section className="panel">
            <SectionTitle title="UI Preferences" />
            <div className="panel-body">
              <div className="settings-row">
                <div>
                  <h3>Appearance</h3>
                  <p>Choose your preferred workspace theme.</p>
                </div>
                <div className="segmented">
                  {(["dark", "light"] as const).map((theme) => (
                    <button
                      aria-pressed={data.preferences.theme === theme}
                      key={theme}
                      className={
                        data.preferences.theme === theme ? "selected" : ""
                      }
                      onClick={() =>
                        updateData((d) => {
                          d.preferences.theme = theme;
                        })
                      }
                    >
                      <span className="flex items-center gap-2">
                        {theme === "dark" ? (
                          <Moon size={13} />
                        ) : (
                          <Sun size={13} />
                        )}
                        {theme === "dark" ? "Dark" : "Light"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-row">
                <div>
                  <h3>Compact tables</h3>
                  <p>Reduce row spacing in patient and assessment lists.</p>
                </div>
                <label className="checkbox-label">
                  <input
                    aria-label="Compact tables"
                    type="checkbox"
                    checked={data.preferences.compact}
                    onChange={(e) =>
                      updateData((d) => {
                        d.preferences.compact = e.target.checked;
                      })
                    }
                  />
                  Enabled
                </label>
              </div>
            </div>
          </section>
        </div>
        <div className="stack">
          <section className="panel">
            <SectionTitle
              title="Workspace Controls"
              subtitle="Test selected application error states"
            />
            <div className="panel-body">
              <div className="settings-row">
                <div>
                  <h3>Fail next mock request</h3>
                  <p>The next saved action will fail once, then recover.</p>
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    aria-label="Fail next mock request"
                    checked={data.preferences.failNext}
                    onChange={(e) =>
                      updateData((d) => {
                        d.preferences.failNext = e.target.checked;
                      })
                    }
                  />
                  Enabled
                </label>
              </div>
              <div className="settings-row">
                <div>
                  <h3>Scenario simulator unavailable</h3>
                  <p>Block new results and scenario simulation.</p>
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    aria-label="Scenario simulator unavailable"
                    checked={data.preferences.modelUnavailable}
                    onChange={(e) =>
                      updateData((d) => {
                        d.preferences.modelUnavailable = e.target.checked;
                      })
                    }
                  />
                  Enabled
                </label>
              </div>
              <div className="settings-row">
                <div>
                  <h3>Restore initial records</h3>
                  <p>Restore the initial patients and assessment records.</p>
                </div>
                <Button variant="destructive" onClick={() => setConfirm(true)}>
                  <RotateCcw size={15} />
                  Reset
                </Button>
              </div>
            </div>
          </section>
          <section className="panel">
            <SectionTitle title="About CardioAssist AI" />
            <div className="panel-body">
              <DemoNotice />
              <dl className="details">
                <div>
                  <dt>Project</dt>
                  <dd>CardioAssist AI</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>2.0</dd>
                </div>
                <div>
                  <dt>Storage</dt>
                  <dd>This browser only</dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd>Assessment engine (unvalidated)</dd>
                </div>
                <div>
                  <dt>Patient integration</dt>
                  <dd>Local patient-app workflow</dd>
                </div>
              </dl>
              <p className="muted text-xs mt-5">
                Records are stored in this browser. Scores are not clinically
                validated and must not be used for medical decisions.
              </p>
              <p className="muted text-xs mt-3">
                Profile edits do not change your sign-in credentials.
              </p>
            </div>
          </section>
        </div>
      </div>
      {confirm && (
        <Modal
          title="Restore initial records?"
          onClose={() => setConfirm(false)}
        >
          <p>
            This removes local patient edits, assessments, reviews, requests,
            drafts, and preferences, then restores the original data.
          </p>
          <div className="actions">
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetDemoData();
                reset({
                  ...getAppData().doctor,
                  hospital: workspaceText(getAppData().doctor.hospital),
                });
                setConfirm(false);
                toast("Initial records restored.");
              }}
            >
              <RotateCcw size={15} />
              Restore initial records
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
