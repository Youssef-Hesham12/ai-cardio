import { workspaceText } from "@/lib/workspace-copy";
import { useState } from "react";
import { Check, X, Smartphone, Plus } from "lucide-react";
import { useAppData, respondToRequest, simulateRequest } from "@/data/store";
import {
  PageHeader,
  Avatar,
  date,
  StatusBadge,
  useAction,
  Go,
  EmptyState,
  Modal,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useAdminData } from "@/data/accounts";
export default function Requests() {
  const data = useAppData();
  const { settings } = useAdminData();
  const [status, setStatus] = useState("Pending");
  const { pending, run } = useAction();
  const [reject, setReject] = useState<string | null>(null);
  const requests = data.requests.filter(
    (r) => status === "All" || r.status === status,
  );
  return (
    <>
      <PageHeader
        title="Patient Requests"
        subtitle="Manage patient connection requests"
        action={
          <Button
            onClick={() =>
              run(simulateRequest, "New connection request received.")
            }
            disabled={pending || !settings.patientConnectionsEnabled}
            title={
              !settings.patientConnectionsEnabled
                ? "New requests are disabled by the administrator"
                : undefined
            }
          >
            <Plus size={15} />
            Simulate patient request
          </Button>
        }
      />
      <div className="tabs">
        {["Pending", "Accepted", "Rejected", "All"].map((value) => (
          <button
            key={value}
            className={status === value ? "selected" : ""}
            onClick={() => setStatus(value)}
          >
            {value} (
            {
              data.requests.filter((r) => value === "All" || r.status === value)
                .length
            }
            )
          </button>
        ))}
      </div>
      {requests.length ? (
        <div className="request-grid">
          {requests.map((request) => (
            <article className="request-card" key={request.id}>
              <div className="patient-cell">
                <Avatar name={workspaceText(request.patient.name)} />
                <div>
                  <strong>{workspaceText(request.patient.name)}</strong>
                  <small>
                    {request.patient.age} years · {request.patient.sex}
                  </small>
                </div>
              </div>
              <p>{workspaceText(request.message)}</p>
              <small className="flex items-center gap-2 mt-3">
                <Smartphone size={12} />
                {date(request.date, true)}
              </small>
              <div className="actions">
                {request.status === "Pending" ? (
                  <>
                    <Button
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => respondToRequest(request.id, true),
                          `${workspaceText(request.patient.name)} is now connected.`,
                        )
                      }
                    >
                      <Check size={15} />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      disabled={pending}
                      onClick={() => setReject(request.id)}
                    >
                      <X size={15} />
                      Reject
                    </Button>
                  </>
                ) : (
                  <>
                    <StatusBadge status={request.status} />
                    {request.status === "Accepted" && (
                      <Go to={`/patients/${request.patient.id}`}>
                        View patient
                      </Go>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No ${status.toLowerCase()} requests`}
          detail="Simulate a patient request to try the connection workflow."
        />
      )}
      {reject && (
        <Modal
          title="Reject connection request?"
          onClose={() => setReject(null)}
        >
          <p>This patient will not be added to your patient directory.</p>
          <div className="actions">
            <Button variant="outline" onClick={() => setReject(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={async () => {
                if (
                  await run(
                    () => respondToRequest(reject, false),
                    "Connection request rejected.",
                  )
                )
                  setReject(null);
              }}
            >
              <X size={15} />
              Reject request
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
