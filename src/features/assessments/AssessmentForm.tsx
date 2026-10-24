import { useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, RotateCcw, Save, ClipboardCheck } from "lucide-react";
import { useAppData, createAssessment, workspaceDraftKey } from "@/data/store";
import {
  PageHeader,
  DemoNotice,
  InputSummary,
  Modal,
  useAction,
  useToast,
  PendingIcon,
  Go,
  EmptyState,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { AssessmentInput } from "@/data/mockData";
export const assessmentSchema = z.object({
  age: z
    .number()
    .min(18, "Enter an age from 18 to 100.")
    .max(100, "Enter an age from 18 to 100."),
  sex: z.enum(["Male", "Female"]),
  systolicBP: z
    .number()
    .min(80, "Enter 80-250 mmHg.")
    .max(250, "Enter 80-250 mmHg."),
  cholesterol: z
    .number()
    .min(100, "Enter 100-400 mg/dL.")
    .max(400, "Enter 100-400 mg/dL."),
  smoking: z.boolean(),
  diabetes: z.boolean(),
});
export default function AssessmentForm() {
  const { patientId } = useParams({ strict: false });
  const data = useAppData();
  const patient = data.patients.find((p) => p.id === patientId);
  const navigate = useNavigate();
  const toast = useToast();
  const { pending, run } = useAction();
  const [review, setReview] = useState<AssessmentInput | null>(null);
  const defaultValues: AssessmentInput = {
    age: patient?.age || 45,
    sex: patient?.sex || "Female",
    systolicBP: 120,
    cholesterol: 180,
    smoking: false,
    diabetes: false,
  };
  const draftKey = workspaceDraftKey("ca-draft-", patientId);
  const loadDraft = () => {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || "null");
      return assessmentSchema.safeParse(draft).success
        ? (draft as AssessmentInput)
        : defaultValues;
    } catch {
      return defaultValues;
    }
  };
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<AssessmentInput>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: loadDraft(),
  });
  if (!patient)
    return (
      <EmptyState
        title="Patient not found"
        action={<Go to="/patients">Patient directory</Go>}
      />
    );
  const submit = async () => {
    if (!review) return;
    await run(async () => {
      const assessment = await createAssessment(patient.id, review);
      localStorage.removeItem(draftKey);
      setReview(null);
      await navigate({
        to: "/assessments/$assessmentId",
        params: { assessmentId: assessment.id },
      });
    }, "assessment created.");
  };
  return (
    <>
      <PageHeader
        title="New CAD Assessment"
        subtitle={`${patient.name} · ${patient.mrn} · input form`}
        back={`/patients/${patient.id}`}
      />
      <DemoNotice />
      <div className="two-column">
        <section className="panel">
          <div className="panel-body">
            <h2>Assessment Details</h2>
            <p className="muted text-xs mt-3">
              Review patient information and measurements before submitting.
            </p>
            <dl className="details mt-5">
              <div>
                <dt>Patient</dt>
                <dd>{patient.name}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>Doctor portal</dd>
              </div>
              <div>
                <dt>Assessment version</dt>
                <dd>2.0</dd>
              </div>
              <div>
                <dt>Result type</dt>
                <dd>Assessment score</dd>
              </div>
            </dl>
          </div>
        </section>
        <section className="panel">
          <form
            className="panel-body"
            onSubmit={handleSubmit(setReview)}
            noValidate
          >
            <h2 className="mb-5">Patient Information</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="input-age">Age (years)</label>
                <input
                  id="input-age"
                  type="number"
                  {...register("age", { valueAsNumber: true })}
                  aria-invalid={!!errors.age}
                />
                <span className="field-error">{errors.age?.message}</span>
              </div>
              <div className="field">
                <label htmlFor="input-sex">Sex</label>
                <select id="input-sex" {...register("sex")}>
                  <option>Female</option>
                  <option>Male</option>
                </select>
              </div>
            </div>
            <h2 className="mt-7 mb-5">Measurements</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="input-bp">Systolic blood pressure (mmHg)</label>
                <input
                  id="input-bp"
                  type="number"
                  {...register("systolicBP", { valueAsNumber: true })}
                  aria-invalid={!!errors.systolicBP}
                />
                <span className="field-error">
                  {errors.systolicBP?.message}
                </span>
              </div>
              <div className="field">
                <label htmlFor="input-chol">Total cholesterol (mg/dL)</label>
                <input
                  id="input-chol"
                  type="number"
                  {...register("cholesterol", { valueAsNumber: true })}
                  aria-invalid={!!errors.cholesterol}
                />
                <span className="field-error">
                  {errors.cholesterol?.message}
                </span>
              </div>
              <label className="checkbox-label">
                <input type="checkbox" {...register("smoking")} />
                Current smoker
              </label>
              <label className="checkbox-label">
                <input type="checkbox" {...register("diabetes")} />
                Diabetes history
              </label>
            </div>
            <div className="form-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  reset(defaultValues);
                  localStorage.removeItem(draftKey);
                  toast("Form reset.");
                }}
              >
                <RotateCcw size={15} />
                Reset
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  localStorage.setItem(draftKey, JSON.stringify(getValues()));
                  toast("Draft saved on this device.");
                }}
              >
                <Save size={15} />
                Save draft
              </Button>
              <Button type="submit">
                <ClipboardCheck size={15} />
                Review inputs
                <ArrowRight size={15} />
              </Button>
            </div>
          </form>
        </section>
      </div>
      {review && (
        <Modal
          title="Review assessment inputs"
          onClose={() => {
            if (!pending) setReview(null);
          }}
        >
          <p>
            Confirm the patient information and measurements before creating the
            assessment.
          </p>
          <InputSummary inputs={review} />
          <div className="form-actions">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setReview(null)}
            >
              Back to form
            </Button>
            <Button disabled={pending} onClick={submit}>
              <PendingIcon pending={pending} />
              {pending ? "Creating assessment..." : "Create assessment"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
