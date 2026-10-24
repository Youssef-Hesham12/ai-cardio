import { workspaceText } from "@/lib/workspace-copy";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Patient } from "@/data/mockData";
import { savePatient } from "@/data/store";
import { Modal, useAction, PendingIcon } from "@/components/shared";
import { Button } from "@/components/ui/button";
const schema = z.object({
  name: z.string().trim().min(3, "Enter a full name (at least 3 characters)."),
  age: z
    .number()
    .min(18, "Age must be at least 18.")
    .max(100, "Age must be 100 or less."),
  sex: z.enum(["Male", "Female"]),
  email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
  phone: z.string(),
  context: z.string().max(1000),
});
type Values = z.infer<typeof schema>;
export default function PatientEditor({
  patient,
  onClose,
}: {
  patient: Patient;
  onClose: () => void;
}) {
  const { pending, run } = useAction();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: workspaceText(patient.name),
      age: patient.age,
      sex: patient.sex,
      email: patient.email || "",
      phone: patient.phone || "",
      context: workspaceText(patient.context || ""),
    },
  });
  return (
    <Modal title="Edit patient" onClose={onClose}>
      <p>Update the patient information below.</p>
      <form
        onSubmit={handleSubmit(async (values) => {
          if (
            await run(
              () =>
                savePatient({
                  ...patient,
                  ...values,
                }),
              "Patient information updated.",
            )
          )
            onClose();
        })}
      >
        <div className="form-grid">
          {(["name", "age", "email", "phone"] as const).map((key) => (
            <div className={`field ${key === "name" ? "full" : ""}`} key={key}>
              <label htmlFor={`patient-${key}`}>
                {key === "name"
                  ? "Full name"
                  : key === "age"
                    ? "Age (years)"
                    : key === "email"
                      ? "email"
                      : "Phone"}
              </label>
              <input
                id={`patient-${key}`}
                type={
                  key === "age" ? "number" : key === "email" ? "email" : "text"
                }
                {...register(key, key === "age" ? { valueAsNumber: true } : {})}
                aria-invalid={!!errors[key]}
              />
              {errors[key] && (
                <span className="field-error">{errors[key]?.message}</span>
              )}
            </div>
          ))}
          <div className="field">
            <label htmlFor="patient-sex">Sex</label>
            <select id="patient-sex" {...register("sex")}>
              <option>Female</option>
              <option>Male</option>
            </select>
          </div>
          <div className="field full">
            <label htmlFor="patient-context">Available clinical context</label>
            <textarea id="patient-context" rows={3} {...register("context")} />
            {errors.context && (
              <span className="field-error">{errors.context.message}</span>
            )}
          </div>
        </div>
        <div className="form-actions">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            <PendingIcon pending={pending} />
            Save patient
          </Button>
        </div>
      </form>
    </Modal>
  );
}
