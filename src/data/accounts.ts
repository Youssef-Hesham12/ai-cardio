import { useSyncExternalStore } from "react";

export type AccountRole = "doctor" | "super_admin";
export interface Account {
  id: string;
  role: AccountRole;
  name: string;
  email: string;
  specialty: string;
  hospital: string;
  status: "Active" | "Suspended";
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  passwordHash: string;
  salt: string;
  credentialVersion: number;
}
export interface AccountSession {
  accountId: string;
  role: AccountRole;
  credentialVersion: number;
}
export interface AdminEvent {
  id: string;
  action: string;
  detail: string;
  actor: string;
  date: string;
}
export interface SystemSettings {
  organization: string;
  supportEmail: string;
  doctorAccessEnabled: boolean;
  patientConnectionsEnabled: boolean;
}
interface AdminData {
  administrator: Account;
  doctors: Account[];
  events: AdminEvent[];
  settings: SystemSettings;
}
export interface DoctorAccountInput {
  name: string;
  email: string;
  specialty: string;
  hospital: string;
}

export const DEFAULT_DOCTOR_ID = "doctor-emily";
export const ADMIN_EMAIL = "admin@cardioassist.test";
export const ADMIN_PASSWORD = "Admin@1234";
const KEY = "cardioassist_admin_v1";
const SESSION_KEY = "cardioassist_session";
const createdAt = "2026-10-08T09:00:00Z";
const profile = (
  id: string,
  name: string,
  email: string,
  specialty: string,
): Account => ({
  id,
  name,
  email,
  specialty,
  hospital: "CardioAssist Medical Center",
  role: "doctor",
  status: "Active",
  createdAt,
  updatedAt: createdAt,
  credentialVersion: 1,
  salt: "cardioassist-staff-v1",
  passwordHash:
    "aaf180e77691d3fed1c76d7fc94ee5dfcfb16c2d3ec6b01a4211382abd143f50",
});
function seed(): AdminData {
  const doctors = [
    {
      ...profile(
        DEFAULT_DOCTOR_ID,
        "Dr. Emily Chen",
        "doctor@cardioassist.demo",
        "Cardiology",
      ),
      salt: "cardioassist-doctor-v1",
      passwordHash:
        "00ccc88bdd0ba391620867df0f20dd8d170868c663a36f895a9560c8813f2c6c",
    },
    profile(
      "doctor-omar",
      "Dr. Omar Hassan",
      "omar.hassan@example.test",
      "Internal Medicine",
    ),
    profile(
      "doctor-sarah",
      "Dr. Sarah Mitchell",
      "sarah.mitchell@example.test",
      "Cardiology",
    ),
    {
      ...profile(
        "doctor-youssef",
        "Dr. Youssef Adel",
        "youssef.adel@example.test",
        "Family Medicine",
      ),
      status: "Suspended" as const,
    },
  ];
  return {
    administrator: {
      ...profile(
        "super-admin",
        "System Administrator",
        ADMIN_EMAIL,
        "System Administration",
      ),
      role: "super_admin",
      salt: "cardioassist-admin-v1",
      passwordHash:
        "c329ce7ba4cd061feb0b70538a5b8806efabe7c4798b304be953d8be0f9209e6",
    },
    doctors,
    events: doctors.map((doctor, index) => ({
      id: `admin-initial-${index}`,
      action: "Doctor account created",
      detail: doctor.name,
      actor: "System Administrator",
      date: createdAt,
    })),
    settings: {
      organization: "CardioAssist AI",
      supportEmail: "support@example.test",
      doctorAccessEnabled: true,
      patientConnectionsEnabled: true,
    },
  };
}
function readData(): AdminData {
  const initial = seed();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (
      saved &&
      Array.isArray(saved.doctors) &&
      Array.isArray(saved.events) &&
      saved.administrator?.role === "super_admin"
    )
      return {
        ...initial,
        ...saved,
        settings: { ...initial.settings, ...saved.settings },
      };
  } catch {
    /* Keep existing patient storage independent of account storage. */
  }
  return initial;
}
let snapshot = readData();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
export const subscribeAccounts = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
window.addEventListener("storage", (event) => {
  if (event.key === KEY || event.key === null) {
    snapshot = readData();
    notify();
  }
});
export const getAdminData = () => snapshot;
export const useAdminData = () =>
  useSyncExternalStore(subscribeAccounts, getAdminData);
export const findAccount = (id: string) =>
  id === snapshot.administrator.id
    ? snapshot.administrator
    : snapshot.doctors.find((account) => account.id === id);
export const doctorWorkspaceKey = (id: string) =>
  id === DEFAULT_DOCTOR_ID
    ? "cardioassist_portal_v2"
    : `cardioassist_workspace_${id}`;

export function readSession(): AccountSession | null {
  try {
    if (localStorage.getItem("cardioassist_auth") !== "true") return null;
    const raw = localStorage.getItem(SESSION_KEY);
    const session: AccountSession = raw
      ? JSON.parse(raw)
      : {
          accountId: DEFAULT_DOCTOR_ID,
          role: "doctor",
          credentialVersion: 1,
        };
    const account = findAccount(session.accountId);
    if (
      !account ||
      account.role !== session.role ||
      account.status !== "Active" ||
      account.credentialVersion !== session.credentialVersion ||
      (account.role === "doctor" && !snapshot.settings.doctorAccessEnabled)
    )
      return null;
    return session;
  } catch {
    return null;
  }
}
export function writeSession(session: AccountSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem("cardioassist_auth", "true");
  } catch (error) {
    localStorage.removeItem("cardioassist_auth");
    localStorage.removeItem(SESSION_KEY);
    throw error;
  }
}
export function clearSession() {
  localStorage.removeItem("cardioassist_auth");
  localStorage.removeItem(SESSION_KEY);
}
function requireAdmin() {
  const session = readSession();
  if (session?.role !== "super_admin")
    throw new Error("Super Admin access is required.");
  return snapshot.administrator;
}
interface LinkedWorkspaceWrite {
  key: string;
  before: string;
  after: string;
}
function persist(data: AdminData, workspace?: LinkedWorkspaceWrite) {
  if (workspace) localStorage.setItem(workspace.key, workspace.after);
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (error) {
    if (workspace) localStorage.setItem(workspace.key, workspace.before);
    throw error;
  }
  snapshot = data;
  notify();
}
function change(
  action: string,
  detail: string,
  mutate: (data: AdminData) => void,
  workspace?: LinkedWorkspaceWrite,
) {
  const actor = requireAdmin();
  const next = structuredClone(snapshot);
  mutate(next);
  next.events.unshift({
    id: crypto.randomUUID(),
    action,
    detail,
    actor: actor.name,
    date: new Date().toISOString(),
  });
  persist(next, workspace);
}
async function passwordHash(password: string, salt: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export async function verifyCredentials(
  email: string,
  password: string,
  role: AccountRole,
): Promise<AccountSession> {
  const normalized = email.trim().toLowerCase();
  const account = [snapshot.administrator, ...snapshot.doctors].find(
    (item) => item.email.toLowerCase() === normalized && item.role === role,
  );
  if (
    !account ||
    (await passwordHash(password, account.salt)) !== account.passwordHash
  )
    throw new Error(
      "The email or password is incorrect. Please check your credentials.",
    );
  const current = findAccount(account.id);
  if (!current || current.credentialVersion !== account.credentialVersion)
    throw new Error("Your account has changed. Please sign in again.");
  if (current.status !== "Active")
    throw new Error(
      "This doctor account is suspended. Contact your administrator.",
    );
  if (role === "doctor" && !snapshot.settings.doctorAccessEnabled)
    throw new Error(
      "Doctor sign-in is temporarily disabled. Contact your administrator.",
    );
  return {
    accountId: current.id,
    role,
    credentialVersion: current.credentialVersion,
  };
}
export function recordLogin(session: AccountSession) {
  try {
    const next = structuredClone(snapshot);
    const account =
      session.role === "super_admin"
        ? next.administrator
        : next.doctors.find((item) => item.id === session.accountId);
    if (account) {
      account.lastLogin = new Date().toISOString();
      persist(next);
    }
  } catch {
    /* Sign-in must not depend on optional activity metadata. */
  }
}
function validateProfile(input: DoctorAccountInput, exceptId?: string) {
  const values: DoctorAccountInput = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    specialty: input.specialty.trim(),
    hospital: input.hospital.trim(),
  };
  if (values.name.length < 3 || values.name.length > 100)
    throw new Error("Enter a full name between 3 and 100 characters.");
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) ||
    values.email.length > 254
  )
    throw new Error("Enter a valid email address.");
  if (
    values.specialty.length < 2 ||
    values.hospital.length < 2 ||
    values.specialty.length > 100 ||
    values.hospital.length > 150
  )
    throw new Error("Enter a specialty and organization.");
  if (
    [snapshot.administrator, ...snapshot.doctors].some(
      (account) =>
        account.id !== exceptId && account.email.toLowerCase() === values.email,
    )
  )
    throw new Error("An account with this email already exists.");
  return values;
}
export function validatePassword(password: string) {
  if (password.length < 8 || password.length > 128)
    throw new Error("Use a password between 8 and 128 characters.");
}
export async function createDoctorAccount(
  input: DoctorAccountInput,
  password: string,
) {
  requireAdmin();
  const values = validateProfile(input);
  validatePassword(password);
  const salt = crypto.randomUUID();
  const hash = await passwordHash(password, salt);
  const account: Account = {
    ...values,
    id: `doctor-${crypto.randomUUID()}`,
    role: "doctor",
    status: "Active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    salt,
    passwordHash: hash,
    credentialVersion: 1,
  };
  change("Doctor account created", account.name, (data) => {
    validateProfile(values);
    data.doctors.unshift(account);
  });
  return account;
}
export function updateDoctorAccount(id: string, input: DoctorAccountInput) {
  requireAdmin();
  const values = validateProfile(input, id);
  const key = doctorWorkspaceKey(id);
  const before = localStorage.getItem(key);
  let workspace: LinkedWorkspaceWrite | undefined;
  if (before) {
    const data = JSON.parse(before);
    if (!data.doctor || !Array.isArray(data.patients))
      throw new Error(
        "The doctor workspace could not be read. No changes were saved.",
      );
    data.doctor = { ...values };
    workspace = { key, before, after: JSON.stringify(data) };
  }
  change(
    "Doctor account updated",
    values.name,
    (data) => {
      const account = data.doctors.find((item) => item.id === id);
      if (!account) throw new Error("Doctor account not found.");
      if (account.email !== values.email) account.credentialVersion++;
      Object.assign(account, values, { updatedAt: new Date().toISOString() });
    },
    workspace,
  );
}
export function setDoctorStatus(id: string, status: Account["status"]) {
  const account = snapshot.doctors.find((item) => item.id === id);
  if (!account) throw new Error("Doctor account not found.");
  change(
    status === "Active" ? "Doctor access restored" : "Doctor access suspended",
    account.name,
    (data) => {
      const target = data.doctors.find((item) => item.id === id)!;
      if (target.status === status)
        throw new Error("This account status has already changed.");
      target.status = status;
      target.credentialVersion++;
      target.updatedAt = new Date().toISOString();
    },
  );
}
export async function resetDoctorPassword(id: string, password: string) {
  requireAdmin();
  validatePassword(password);
  const salt = crypto.randomUUID();
  const hash = await passwordHash(password, salt);
  change(
    "Doctor password reset",
    snapshot.doctors.find((account) => account.id === id)?.name || id,
    (data) => {
      const account = data.doctors.find((item) => item.id === id);
      if (!account) throw new Error("Doctor account not found.");
      Object.assign(account, {
        salt,
        passwordHash: hash,
        credentialVersion: account.credentialVersion + 1,
        updatedAt: new Date().toISOString(),
      });
    },
  );
}
export function saveSystemSettings(settings: SystemSettings) {
  const organization = settings.organization.trim();
  const supportEmail = settings.supportEmail.trim().toLowerCase();
  if (
    organization.length < 2 ||
    organization.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)
  )
    throw new Error("Enter an organization name and valid support email.");
  change("System settings updated", organization, (data) => {
    if (data.settings.doctorAccessEnabled && !settings.doctorAccessEnabled)
      data.doctors.forEach((account) => {
        account.credentialVersion++;
      });
    data.settings = { ...settings, organization, supportEmail };
  });
}
