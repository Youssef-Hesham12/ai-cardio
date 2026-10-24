import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  LoaderCircle,
  MessageSquare,
  Send,
  SquarePen,
  UserRound,
} from "lucide-react";
import {
  Avatar,
  date,
  EmptyState,
  Go,
  Modal,
  PageHeader,
  SearchInput,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  markPatientMessagesRead,
  sendPatientMessage,
  useAppData,
  workspaceDraftKey,
} from "@/data/store";
import type { Patient, PatientMessage } from "@/data/mockData";
import { workspaceText } from "@/lib/workspace-copy";
import "./messages.css";

const time = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
const day = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
const draftKey = (patientId: string) =>
  workspaceDraftKey("ca-message-draft-", patientId);

function Conversation({
  patient,
  messages,
}: {
  patient: Patient;
  messages: PatientMessage[];
}) {
  const [body, setBody] = useState(() => {
    try {
      return (localStorage.getItem(draftKey(patient.id)) || "").slice(0, 2000);
    } catch {
      return "";
    }
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [draftError, setDraftError] = useState("");
  const [readError, setReadError] = useState("");
  const [saved, setSaved] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  const active = patient.status === "Active";
  const unread = messages.filter(
    (message) => message.sender === "Patient" && !message.read,
  ).length;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!unread) return;
    try {
      markPatientMessagesRead(patient.id);
      setReadError("");
    } catch {
      setReadError(
        "Could not update unread status. Browser storage is unavailable.",
      );
    }
  }, [patient.id, unread]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages.length]);
  const changeBody = (value: string) => {
    setBody(value);
    setError("");
    setSaved(false);
    try {
      if (value) localStorage.setItem(draftKey(patient.id), value);
      else localStorage.removeItem(draftKey(patient.id));
      setDraftError("");
    } catch {
      setDraftError(
        "Draft not saved. Keep this conversation open until you send it.",
      );
    }
  };
  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!active || !body.trim() || lock.current) return;
    const submitted = body;
    lock.current = true;
    setPending(true);
    setError("");
    setSaved(false);
    try {
      await sendPatientMessage(patient.id, submitted);
      try {
        if (localStorage.getItem(draftKey(patient.id)) === submitted)
          localStorage.removeItem(draftKey(patient.id));
      } catch {
        /* The message itself has already been persisted successfully. */
      }
      if (mounted.current) {
        setBody("");
        setDraftError("");
        setSaved(true);
      }
    } catch (failure) {
      if (mounted.current)
        setError(
          workspaceText(
            failure instanceof Error
              ? failure.message
              : "Message could not be saved. Please try again.",
          ),
        );
    } finally {
      lock.current = false;
      if (mounted.current) {
        setPending(false);
        input.current?.focus();
      }
    }
  };
  return (
    <section
      className="message-thread"
      aria-label={`Conversation with ${workspaceText(patient.name)}`}
    >
      <header className="message-thread-header">
        <Link
          to="/messages"
          className="message-back"
          aria-label="Back to conversations"
          title="Back to conversations"
        >
          <ArrowLeft size={18} />
        </Link>
        <Avatar name={workspaceText(patient.name)} />
        <div className="message-patient-heading">
          <h2>{workspaceText(patient.name)}</h2>
          <span>
            {patient.mrn} /{" "}
            {patient.status === "Active"
              ? "Connected patient"
              : "Inactive patient"}
          </span>
        </div>
        <Go to={`/patients/${patient.id}`} className="message-profile">
          <UserRound size={15} />
          Profile
        </Go>
      </header>
      {readError && (
        <p className="message-error" role="alert">
          {readError}
        </p>
      )}
      <div className="message-history">
        <div
          className="message-log"
          ref={log}
          role="log"
          aria-label="Conversation history"
          aria-live="polite"
          aria-relevant="additions"
        >
          {!messages.length ? (
            <div className="message-thread-empty">
              <MessageSquare size={26} />
              <h3>No messages yet</h3>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={message.id}>
                {(index === 0 ||
                  day(messages[index - 1].date) !== day(message.date)) && (
                  <p className="message-day">{day(message.date)}</p>
                )}
                <div
                  className={`message-row ${message.sender === "Doctor" ? "outgoing" : "incoming"}`}
                >
                  {message.sender === "Patient" && (
                    <Avatar name={workspaceText(patient.name)} />
                  )}
                  <article
                    className={`message-entry ${message.sender === "Doctor" ? "outgoing" : "incoming"}`}
                    aria-label={
                      message.sender === "Doctor"
                        ? "Your message"
                        : `${workspaceText(patient.name)}'s message`
                    }
                  >
                    <p dir="auto">{message.body}</p>
                    <footer>
                      <time
                        dateTime={message.date}
                        title={date(message.date, true)}
                      >
                        {time(message.date)}
                      </time>
                      {message.sender === "Doctor" && (
                        <span>
                          <Check size={12} />
                          Saved
                        </span>
                      )}
                    </footer>
                  </article>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <form
        className="message-composer"
        onSubmit={submit}
        aria-label="Write a patient message"
        aria-busy={pending}
      >
        <label className="sr-only" htmlFor="patient-message">
          Message to {workspaceText(patient.name)}
        </label>
        <div className="message-compose-box">
          <textarea
            dir="auto"
            id="patient-message"
            ref={input}
            rows={2}
            maxLength={2000}
            value={body}
            disabled={!active || pending}
            placeholder={
              active
                ? "Write a message..."
                : "Messaging is unavailable for inactive patients."
            }
            aria-describedby="message-composer-meta"
            aria-invalid={!!error}
            onChange={(event) => changeBody(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void submit();
              }
            }}
          />
          <div className="message-composer-footer" id="message-composer-meta">
            <span>
              Stored locally <span aria-hidden="true">/</span>{" "}
              {body.length.toLocaleString()} / 2,000
            </span>
            <span className="sr-only" role="status">
              {saved ? "Message saved." : ""}
            </span>
            <Button type="submit" disabled={!active || !body.trim() || pending}>
              {pending ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              {pending ? "Saving..." : "Send"}
            </Button>
          </div>
        </div>
        {(error || draftError) && (
          <p className="message-error" role="alert">
            <CircleAlert size={14} />
            {error || draftError}
          </p>
        )}
      </form>
    </section>
  );
}

export default function Messages() {
  const data = useAppData();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { patient?: string };
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [newMessage, setNewMessage] = useState(false);
  const [patientQuery, setPatientQuery] = useState("");
  const patient = data.patients.find((p) => p.id === search.patient);
  const conversationMessages = data.messages
    .filter((message) => message.patientId === patient?.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  const threads = data.patients
    .map((p) => {
      const messages = data.messages
        .filter((message) => message.patientId === p.id)
        .sort((a, b) => a.date.localeCompare(b.date));
      return {
        patient: p,
        messages,
        last: messages[messages.length - 1],
        unread: messages.filter(
          (message) => message.sender === "Patient" && !message.read,
        ).length,
      };
    })
    .filter(
      (thread) =>
        (thread.last || thread.patient.id === patient?.id) &&
        (!unreadOnly || thread.unread > 0) &&
        (`${workspaceText(thread.patient.name)} ${thread.patient.mrn}`
          .toLowerCase()
          .includes(query.toLowerCase()) ||
          thread.messages.some((message) =>
            message.body.toLowerCase().includes(query.toLowerCase()),
          )),
    )
    .sort((a, b) => (b.last?.date || "").localeCompare(a.last?.date || ""));
  const connected = data.patients.filter((p) =>
    `${workspaceText(p.name)} ${p.mrn}`
      .toLowerCase()
      .includes(patientQuery.toLowerCase()),
  );
  const unreadConversations = new Set(
    data.messages
      .filter(
        (message) =>
          message.sender === "Patient" &&
          !message.read &&
          data.patients.some((p) => p.id === message.patientId),
      )
      .map((message) => message.patientId),
  ).size;
  return (
    <>
      <PageHeader
        title="Messages"
        subtitle="Patient conversations"
        action={
          <Button
            onClick={() => {
              setPatientQuery("");
              setNewMessage(true);
            }}
          >
            <SquarePen size={16} />
            New message
          </Button>
        }
      />
      <div
        className={`messages-workspace ${search.patient ? "has-conversation" : ""}`}
      >
        <aside className="message-inbox" aria-label="Conversations">
          <div className="message-inbox-tools">
            <div className="message-inbox-heading">
              <h2>Conversations</h2>
              <span>{threads.length}</span>
            </div>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search conversations..."
            />
            <div className="segmented" aria-label="Conversation filter">
              <button
                className={!unreadOnly ? "selected" : ""}
                aria-pressed={!unreadOnly}
                onClick={() => setUnreadOnly(false)}
              >
                All
              </button>
              <button
                className={unreadOnly ? "selected" : ""}
                aria-pressed={unreadOnly}
                onClick={() => setUnreadOnly(true)}
              >
                Unread
                {unreadConversations > 0 ? ` (${unreadConversations})` : ""}
              </button>
            </div>
          </div>
          <nav
            className="message-thread-list"
            aria-label="Patient conversations"
          >
            {threads.map((thread) => (
              <Link
                key={thread.patient.id}
                to="/messages"
                search={{ patient: thread.patient.id }}
                className={`message-thread-link ${patient?.id === thread.patient.id ? "selected" : ""}`}
                aria-current={
                  patient?.id === thread.patient.id ? "page" : undefined
                }
                aria-label={`Conversation with ${workspaceText(thread.patient.name)}`}
              >
                <Avatar name={workspaceText(thread.patient.name)} />
                <div>
                  <div className="message-thread-title">
                    <strong>{workspaceText(thread.patient.name)}</strong>
                    {thread.last && (
                      <time
                        dateTime={thread.last.date}
                        title={date(thread.last.date, true)}
                      >
                        {time(thread.last.date)}
                      </time>
                    )}
                  </div>
                  <p>
                    {thread.last
                      ? `${thread.last.sender === "Doctor" ? "You: " : ""}${thread.last.body}`
                      : "New conversation"}
                  </p>
                  <small>{thread.patient.mrn}</small>
                </div>
                {thread.unread > 0 && (
                  <span
                    className="message-unread"
                    aria-label={`${thread.unread} unread messages`}
                  >
                    {thread.unread}
                  </span>
                )}
              </Link>
            ))}
            {!threads.length && (
              <EmptyState
                title={
                  query
                    ? "No matching conversations"
                    : unreadOnly
                      ? "No unread conversations"
                      : "No conversations yet"
                }
                detail={query ? "Try a different patient name or message." : ""}
              />
            )}
          </nav>
        </aside>
        {patient ? (
          <Conversation
            key={patient.id}
            patient={patient}
            messages={conversationMessages}
          />
        ) : (
          <section className="message-selection" aria-label="Conversation">
            <MessageSquare size={32} />
            <h2>
              {search.patient
                ? "Patient not connected"
                : "Select a conversation"}
            </h2>
            {search.patient ? (
              <Go to="/requests">Patient requests</Go>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setPatientQuery("");
                  setNewMessage(true);
                }}
              >
                <SquarePen size={15} />
                New message
              </Button>
            )}
          </section>
        )}
      </div>
      {newMessage && (
        <Modal title="New message" onClose={() => setNewMessage(false)}>
          <SearchInput
            value={patientQuery}
            onChange={setPatientQuery}
            placeholder="Find a connected patient..."
          />
          <div className="message-patient-picker">
            {connected.map((p) => (
              <button
                type="button"
                key={p.id}
                disabled={p.status !== "Active"}
                aria-label={`Message ${workspaceText(p.name)}`}
                onClick={() => {
                  setNewMessage(false);
                  setQuery("");
                  setUnreadOnly(false);
                  void navigate({ to: "/messages", search: { patient: p.id } });
                }}
              >
                <Avatar name={workspaceText(p.name)} />
                <span>
                  <strong>{workspaceText(p.name)}</strong>
                  <small>
                    {p.mrn} / {p.status === "Active" ? "Connected" : "Inactive"}
                  </small>
                </span>
                <MessageSquare size={16} />
              </button>
            ))}
            {!connected.length && (
              <EmptyState
                title="No connected patients found"
                detail=""
                action={<Go to="/requests">Patient requests</Go>}
              />
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
