import { workspaceText } from "@/lib/workspace-copy";
import { useState } from "react";
import { Check, Save, MessageSquareMore } from "lucide-react";
import type { Assessment, ReviewStatus } from "@/data/mockData";
import { reviewAssessment } from "@/data/store";
import { useAction, PendingIcon } from "@/components/shared";
import { Button } from "@/components/ui/button";
export default function ReviewForm({ assessment }: { assessment: Assessment }) {
  const [notes, setNotes] = useState(
    workspaceText(assessment.doctorNotes || ""),
  );
  const [followUp, setFollowUp] = useState(!!assessment.followUp);
  const [error, setError] = useState("");
  const { pending, run } = useAction();
  const save = async (status: ReviewStatus) => {
    if (!notes.trim()) {
      setError("Add a review note before saving.");
      return;
    }
    setError("");
    await run(
      () => reviewAssessment(assessment.id, notes.trim(), status, followUp),
      status === "Reviewed"
        ? "Assessment marked reviewed. All records updated."
        : status === "Needs Info"
          ? "Additional information requested."
          : "Review notes saved.",
    );
  };
  return (
    <div className="panel-body">
      <div className="field">
        <label htmlFor="doctor-notes">Doctor review notes</label>
        <textarea
          id="doctor-notes"
          rows={5}
          placeholder="Document your review of this record..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={3000}
          aria-invalid={!!error}
        />
        <span className="field-error">{error}</span>
      </div>
      <label className="checkbox-label mt-4">
        <input
          type="checkbox"
          checked={followUp}
          onChange={(e) => setFollowUp(e.target.checked)}
        />
        Follow-up required
      </label>
      <div className="form-actions">
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => save(assessment.status)}
        >
          <Save size={15} />
          Save notes
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => save("Needs Info")}
        >
          <MessageSquareMore size={15} />
          Request information
        </Button>
        <Button disabled={pending} onClick={() => save("Reviewed")}>
          {pending ? <PendingIcon pending /> : <Check size={15} />}Mark reviewed
        </Button>
      </div>
    </div>
  );
}
