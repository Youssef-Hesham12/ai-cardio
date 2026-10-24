import { useSyncExternalStore } from "react";
import { createSeed, DEMO_simulateAssessment } from "./mockData";
import {
  DEFAULT_DOCTOR_ID,
  doctorWorkspaceKey,
  findAccount,
  getAdminData,
  readSession,
} from "./accounts";
import type {
  AppData,
  Patient,
  Assessment,
  AssessmentInput,
  ReviewStatus,
  PatientMessage,
} from "./mockData";
export type {
  Patient,
  Assessment,
  AssessmentInput,
  AssessmentResult,
} from "./mockData";
const initialSession = readSession();
let activeDoctorId =
  initialSession?.role === "doctor"
    ? initialSession.accountId
    : DEFAULT_DOCTOR_ID;
let KEY = doctorWorkspaceKey(activeDoctorId);
const listeners = new Set<() => void>();
function workspaceSeed(): AppData {
  const seed = createSeed();
  if (activeDoctorId !== DEFAULT_DOCTOR_ID) {
    const account = findAccount(activeDoctorId);
    seed.patients = [];
    seed.assessments = [];
    seed.requests = [];
    seed.notifications = [];
    seed.activities = [];
    seed.reviews = [];
    seed.messages = [];
    if (account)
      seed.doctor = {
        name: account.name,
        email: account.email,
        specialty: account.specialty,
        hospital: account.hospital,
      };
  }
  return seed;
}
function load(theme?: "light" | "dark"): AppData {
  const seed = workspaceSeed();
  if (theme) seed.preferences.theme = theme;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (
        Array.isArray(data.patients) &&
        Array.isArray(data.assessments) &&
        Array.isArray(data.requests)
      )
        return {
          ...seed,
          ...data,
          messages: Array.isArray(data.messages) ? data.messages : [],
        };
    }
    const legacy = localStorage.getItem("cardioassist_demo_data");
    if (legacy && activeDoctorId === DEFAULT_DOCTOR_ID) {
      const old = JSON.parse(legacy);
      if (Array.isArray(old.patients) && Array.isArray(old.assessments)) {
        seed.patients = [
          ...old.patients,
          ...seed.patients.filter(
            (p) => !old.patients.some((x: Patient) => x.id === p.id),
          ),
        ];
        seed.assessments = [
          ...old.assessments,
          ...seed.assessments.filter(
            (a) => !old.assessments.some((x: Assessment) => x.id === a.id),
          ),
        ];
      }
    }
  } catch {
    /* A damaged demo save falls back to the deterministic seed. */
  }
  return seed;
}
let snapshot = load();
window.addEventListener("storage", (event) => {
  if (event.key === KEY || event.key === null) {
    snapshot = load();
    listeners.forEach((listener) => listener());
  }
});
export function activateDoctorWorkspace(accountId: string) {
  const theme = snapshot.preferences.theme;
  activeDoctorId = accountId;
  KEY = doctorWorkspaceKey(accountId);
  snapshot = load(theme);
  listeners.forEach((listener) => listener());
}
export const getActiveDoctorId = () => activeDoctorId;
export const workspaceDraftKey = (prefix: string, recordId = "") =>
  `${activeDoctorId === DEFAULT_DOCTOR_ID ? "" : `${KEY}:`}${prefix}${recordId}`;
export function getDoctorWorkspaceStats(accountId: string) {
  let data: Partial<AppData> = {};
  try {
    if (accountId === activeDoctorId) data = snapshot;
    else {
      const saved = localStorage.getItem(doctorWorkspaceKey(accountId));
      data = saved
        ? JSON.parse(saved)
        : accountId === DEFAULT_DOCTOR_ID
          ? createSeed()
          : {};
    }
  } catch {
    /* An unavailable workspace contributes no fabricated records. */
  }
  return {
    patients: Array.isArray(data.patients) ? data.patients.length : 0,
    assessments: Array.isArray(data.assessments) ? data.assessments.length : 0,
    pendingRequests: Array.isArray(data.requests)
      ? data.requests.filter((request) => request.status === "Pending").length
      : 0,
  };
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function useAppData() {
  return useSyncExternalStore(subscribe, () => snapshot);
}
export function getAppData() {
  return snapshot;
}
export function saveAppData(data: AppData) {
  // Persist first so failed storage writes never leave visible state ahead of saved data.
  localStorage.setItem(KEY, JSON.stringify(data));
  snapshot = data;
  listeners.forEach((listener) => listener());
}
export function updateData(change: (data: AppData) => void) {
  const copy = structuredClone(snapshot);
  change(copy);
  saveAppData(copy);
}
export function resetDemoData() {
  saveAppData(workspaceSeed());
  Object.keys(localStorage)
    .filter(
      (key) =>
        key.startsWith(workspaceDraftKey("ca-draft-")) ||
        key.startsWith(workspaceDraftKey("ca-message-draft-")),
    )
    .forEach((key) => localStorage.removeItem(key));
}
export const id = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

export async function sendPatientMessage(patientId: string, body: string) {
  const text = body.trim();
  if (!text) throw new Error("Write a message before sending.");
  if (text.length > 2000)
    throw new Error("Messages can contain up to 2,000 characters.");
  return mockRequest(() => {
    let message: PatientMessage | undefined;
    updateData((data) => {
      const patient = data.patients.find((p) => p.id === patientId);
      if (!patient)
        throw new Error(
          "Accept the patient's connection request before messaging.",
        );
      if (patient.status !== "Active")
        throw new Error("Messaging is unavailable for inactive patients.");
      message = {
        id: id("msg"),
        patientId,
        sender: "Doctor",
        body: text,
        date: new Date().toISOString(),
        read: true,
      };
      data.messages.push(message);
    });
    return message!;
  });
}

export function markPatientMessagesRead(patientId: string) {
  if (!snapshot.patients.some((patient) => patient.id === patientId)) return;
  if (
    !snapshot.messages.some(
      (message) =>
        message.patientId === patientId &&
        message.sender === "Patient" &&
        !message.read,
    )
  )
    return;
  updateData((data) => {
    data.messages.forEach((message) => {
      if (message.patientId === patientId && message.sender === "Patient")
        message.read = true;
    });
  });
}
export function addEvent(
  data: AppData,
  title: string,
  detail: string,
  patientId?: string,
  assessmentId?: string,
) {
  data.activities.unshift({
    id: id("event"),
    title,
    detail,
    patientId,
    assessmentId,
    date: new Date().toISOString(),
  });
}
export function addNotification(
  data: AppData,
  title: string,
  message: string,
  href: string,
) {
  data.notifications.unshift({
    id: id("notice"),
    title,
    message,
    href,
    date: new Date().toISOString(),
    read: false,
  });
}
export async function mockRequest<T>(
  action: () => T,
  needsModel = false,
): Promise<T> {
  const workspace = KEY;
  const startedSession = readSession();
  await new Promise((resolve) => setTimeout(resolve, 450));
  const session = readSession();
  if (
    KEY !== workspace ||
    session?.role !== "doctor" ||
    session.credentialVersion !== startedSession?.credentialVersion ||
    session.accountId !== activeDoctorId
  )
    throw new Error("Your session has changed. Sign in again to continue.");
  if (snapshot.preferences.failNext) {
    updateData((d) => {
      d.preferences.failNext = false;
    });
    throw new Error(
      "The demo request failed. Your changes were not saved. Please try again.",
    );
  }
  if (needsModel && snapshot.preferences.modelUnavailable)
    throw new Error(
      "The demo simulator is unavailable. Enable it in Settings and try again.",
    );
  return action();
}
export const getPatients = () => mockRequest(() => snapshot.patients);
export const getPatientById = (patientId: string) =>
  mockRequest(() => snapshot.patients.find((p) => p.id === patientId));
export const getAssessmentsByPatient = (patientId: string) =>
  mockRequest(() => patientAssessments(snapshot, patientId));
export const getAssessmentById = (assessmentId: string) =>
  mockRequest(() => snapshot.assessments.find((a) => a.id === assessmentId));
export const saveAssessment = (assessment: Assessment) =>
  mockRequest(() =>
    updateData((d) => {
      const index = d.assessments.findIndex((a) => a.id === assessment.id);
      if (index < 0) d.assessments.unshift(assessment);
      else d.assessments[index] = assessment;
    }),
  );
export function patientAssessments(data: AppData, patientId: string) {
  return data.assessments
    .filter((a) => a.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function latestAssessment(data: AppData, patientId: string) {
  return patientAssessments(data, patientId)[0];
}
export async function createAssessment(
  patientId: string,
  inputs: AssessmentInput,
  source: "Doctor" | "Mobile" = "Doctor",
) {
  return mockRequest(() => {
    const assessment: Assessment = {
      id: id("a"),
      patientId,
      inputs,
      result: DEMO_simulateAssessment(inputs),
      status: "Pending",
      source,
      date: new Date().toISOString(),
    };
    updateData((d) => {
      const patient = d.patients.find((p) => p.id === patientId);
      if (!patient) throw new Error("Patient not found.");
      d.assessments.unshift(assessment);
      patient.lastVisit = assessment.date;
      patient.updatedAt = assessment.date;
      addEvent(
        d,
        `${source} assessment created`,
        `${patient.name}: new synthetic assessment awaiting review.`,
        patientId,
        assessment.id,
      );
      addNotification(
        d,
        "Assessment awaiting review",
        `${patient.name} has a new ${source.toLowerCase()} demo assessment.`,
        `/assessments/${assessment.id}`,
      );
    });
    return assessment;
  }, true);
}
export async function reviewAssessment(
  assessmentId: string,
  notes: string,
  status: ReviewStatus,
  followUp: boolean,
) {
  return mockRequest(() =>
    updateData((d) => {
      const assessment = d.assessments.find((a) => a.id === assessmentId);
      if (!assessment) throw new Error("Assessment not found.");
      Object.assign(assessment, { status, doctorNotes: notes, followUp });
      const patient = d.patients.find((p) => p.id === assessment.patientId);
      if (patient) {
        patient.followUp = followUp;
        patient.updatedAt = new Date().toISOString();
      }
      d.reviews.unshift({
        id: id("review"),
        assessmentId,
        notes,
        status,
        followUp,
        date: new Date().toISOString(),
      });
      addEvent(
        d,
        status === "Reviewed"
          ? "Assessment reviewed"
          : status === "Needs Info"
            ? "Additional information requested"
            : "Review notes saved",
        notes || "Demo review status updated.",
        assessment.patientId,
        assessmentId,
      );
      addNotification(
        d,
        "Review status updated",
        `${patient?.name}: ${status.toLowerCase()}.`,
        `/assessments/${assessmentId}`,
      );
    }),
  );
}
export async function savePatient(patient: Patient) {
  return mockRequest(() =>
    updateData((d) => {
      const index = d.patients.findIndex((p) => p.id === patient.id);
      if (index < 0)
        throw new Error(
          "Only connected patients can be edited. Accept a patient connection request first.",
        );
      const updatedPatient = {
        ...patient,
        updatedAt: new Date().toISOString(),
      };
      d.patients[index] = updatedPatient;
      addEvent(d, "Patient information updated", patient.name, patient.id);
    }),
  );
}
export async function respondToRequest(requestId: string, accepted: boolean) {
  return mockRequest(() =>
    updateData((d) => {
      const request = d.requests.find((r) => r.id === requestId);
      if (!request || request.status !== "Pending")
        throw new Error("This request has already been handled.");
      request.status = accepted ? "Accepted" : "Rejected";
      if (accepted && !d.patients.some((p) => p.id === request.patient.id))
        d.patients.unshift(request.patient);
      addEvent(
        d,
        `Connection ${accepted ? "accepted" : "rejected"}`,
        request.patient.name,
        accepted ? request.patient.id : undefined,
      );
    }),
  );
}
export async function simulateRequest() {
  return mockRequest(() =>
    updateData((d) => {
      if (!getAdminData().settings.patientConnectionsEnabled)
        throw new Error(
          "New patient connection requests are disabled by your administrator.",
        );
      const number = d.requests.length + 1;
      const patient: Patient = {
        id: id("p"),
        name: `Demo Patient ${number}`,
        mrn: `CA-REQ-${number}`,
        age: 40 + (number % 25),
        sex: number % 2 ? "Female" : "Male",
        status: "Active",
        lastVisit: new Date().toISOString(),
        context: "Fictional mobile connection request.",
      };
      d.requests.unshift({
        id: id("req"),
        patient,
        status: "Pending",
        date: patient.lastVisit,
        message: "Please connect my demo patient account.",
      });
      addNotification(
        d,
        "New patient connection request",
        `${patient.name} would like to connect.`,
        "/requests",
      );
      addEvent(d, "Connection requested", patient.name);
    }),
  );
}
