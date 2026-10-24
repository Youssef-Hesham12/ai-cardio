export type RiskLevel = "Low" | "Moderate" | "High";
export type ReviewStatus = "Pending" | "Reviewed" | "Needs Info";
export interface Doctor {
  name: string;
  email: string;
  specialty: string;
  hospital: string;
}
export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: "Male" | "Female";
  mrn: string;
  lastVisit: string;
  updatedAt?: string;
  status: "Active" | "Inactive";
  email?: string;
  phone?: string;
  context?: string;
  followUp?: boolean;
  avatarUrl?: string;
}
export interface AssessmentInput {
  age: number;
  sex: "Male" | "Female";
  systolicBP: number;
  cholesterol: number;
  smoking: boolean;
  diabetes: boolean;
}
export interface AssessmentResult {
  score: number;
  riskLevel: RiskLevel;
  modelVersion: string;
  contributions: {
    feature: string;
    value: number;
    type: "positive" | "negative";
  }[];
}
export interface Review {
  id: string;
  assessmentId: string;
  notes: string;
  status: ReviewStatus;
  date: string;
  followUp: boolean;
}
export interface Assessment {
  id: string;
  patientId: string;
  date: string;
  inputs: AssessmentInput;
  result: AssessmentResult;
  status: ReviewStatus;
  doctorNotes?: string;
  followUp?: boolean;
  source?: "Doctor" | "Mobile";
}
export interface ConnectionRequest {
  id: string;
  patient: Patient;
  date: string;
  status: "Pending" | "Accepted" | "Rejected";
  message: string;
}
export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  href: string;
}
export interface ActivityEvent {
  id: string;
  patientId?: string;
  assessmentId?: string;
  title: string;
  detail: string;
  date: string;
}
export interface PatientMessage {
  id: string;
  patientId: string;
  sender: "Doctor" | "Patient";
  body: string;
  date: string;
  read: boolean;
}
export interface AppData {
  patients: Patient[];
  assessments: Assessment[];
  requests: ConnectionRequest[];
  notifications: Notification[];
  activities: ActivityEvent[];
  reviews: Review[];
  messages: PatientMessage[];
  doctor: Doctor;
  preferences: {
    theme: "dark" | "light";
    compact: boolean;
    failNext: boolean;
    modelUnavailable: boolean;
  };
}

// A deterministic UI simulator. These arbitrary weights have no clinical meaning.
export function DEMO_simulateAssessment(
  input: AssessmentInput,
): AssessmentResult {
  const values = [
    { feature: "Age", value: Math.round((input.age - 40) * 0.45) },
    {
      feature: "Systolic blood pressure",
      value: Math.round((input.systolicBP - 120) * 0.3),
    },
    {
      feature: "Total cholesterol",
      value: Math.round((input.cholesterol - 180) * 0.12),
    },
    { feature: "Smoking status", value: input.smoking ? 18 : -8 },
    { feature: "Diabetes status", value: input.diabetes ? 14 : -5 },
    { feature: "Sex", value: input.sex === "Male" ? 4 : -2 },
  ];
  const score = Math.max(
    1,
    Math.min(99, 35 + values.reduce((sum, item) => sum + item.value, 0)),
  );
  return {
    score,
    riskLevel: score >= 65 ? "High" : score >= 35 ? "Moderate" : "Low",
    modelVersion: "DEMO-2.0",
    contributions: values.map((item) => ({
      ...item,
      type: item.value >= 0 ? "positive" : "negative",
    })),
  };
}
const identities: [string, number, "Male" | "Female"][] = [
  ["Ahmed Ali", 58, "Male"],
  ["Sarah Johnson", 45, "Female"],
  ["Michael Chen", 62, "Male"],
  ["Fatima Rahman", 50, "Female"],
  ["James Wilson", 71, "Male"],
  ["Mariam Hassan", 39, "Female"],
  ["Omar Mostafa", 56, "Male"],
  ["Nour Ibrahim", 43, "Female"],
  ["Khaled Adel", 67, "Male"],
  ["Salma Youssef", 36, "Female"],
  ["Hassan Mahmoud", 60, "Male"],
  ["Dina Farouk", 48, "Female"],
  ["Youssef Sami", 54, "Male"],
  ["Layla Nabil", 41, "Female"],
  ["Tarek Saad", 65, "Male"],
  ["Hana Mohamed", 33, "Female"],
  ["Amr Khalil", 59, "Male"],
  ["Reem Ashraf", 46, "Female"],
];
export const initialPatients: Patient[] = identities.map(
  ([name, age, sex], i) => ({
    id: `p-${i + 1}`,
    name,
    age,
    sex,
    mrn: `CA-${String(1001 + i)}`,
    status: "Active",
    lastVisit: `2026-10-${String(8 - (i % 7)).padStart(2, "0")}T10:00:00Z`,
    email: `${name.toLowerCase().replace(/ /g, ".")}@example.test`,
    phone: `+20 100 000 ${String(1000 + i)}`,
    context:
      i % 3 === 0
        ? "Patient-submitted history awaiting confirmation."
        : "Routine follow-up. Illustrative inputs supplied for the academic demo.",
    followUp: i % 4 === 0,
  }),
);
export const initialAssessments: Assessment[] = initialPatients.flatMap(
  (patient, i) =>
    [0, 1, 2].map((j) => {
      const inputs: AssessmentInput = {
        age: patient.age,
        sex: patient.sex,
        systolicBP: 110 + ((i * 13 + j * 7) % 65),
        cholesterol: 155 + ((i * 27 + j * 19) % 130),
        smoking: (i + j) % 3 === 0,
        diabetes: i % 4 === 0,
      };
      return {
        id: `a-${i * 3 + j + 1}`,
        patientId: patient.id,
        date:
          j === 2
            ? patient.lastVisit
            : `2026-${j === 0 ? "08" : "09"}-${String(10 + i).padStart(2, "0")}T10:00:00Z`,
        inputs,
        result: {
          ...DEMO_simulateAssessment(inputs),
          modelVersion: j === 0 ? "DEMO-1.0" : "DEMO-2.0",
        },
        status:
          j < 2 || i % 3 === 1
            ? "Reviewed"
            : i % 5 === 2
              ? "Needs Info"
              : "Pending",
        doctorNotes:
          j < 2 || i % 3 === 1
            ? "Demo record reviewed. Patient-submitted context documented; no treatment recommendation generated."
            : "",
        followUp: i % 4 === 0,
        source: j === 2 && i % 2 === 0 ? "Mobile" : "Doctor",
      } as Assessment;
    }),
);
export function createSeed(): AppData {
  const requests: ConnectionRequest[] = [
    "Heba Mansour",
    "Karim Fathy",
    "Nada Saleh",
  ].map((name, i) => ({
    id: `req-${i + 1}`,
    patient: {
      id: `p-request-${i + 1}`,
      name,
      age: 42 + i * 9,
      sex: i === 1 ? "Male" : "Female",
      mrn: `CA-${2001 + i}`,
      lastVisit: "2026-10-08T14:00:00Z",
      status: "Active",
      context: "Connected through the simulated patient mobile app.",
    },
    date: `2026-10-0${8 - i}T14:00:00Z`,
    status: "Pending",
    message: "I would like to connect with you to share my assessment records.",
  }));
  return structuredClone({
    patients: initialPatients,
    assessments: initialAssessments,
    requests,
    doctor: {
      name: "Dr. Emily Chen",
      email: "doctor@cardioassist.demo",
      specialty: "Cardiology",
      hospital: "CardioAssist Academic Clinic",
    },
    preferences: {
      theme: "light",
      compact: false,
      failNext: false,
      modelUnavailable: false,
    },
    reviews: [],
    messages: [
      {
        id: "msg-1",
        patientId: "p-1",
        sender: "Doctor",
        body: "Hello Ahmed, you can send any questions about your appointment here.",
        date: "2026-10-08T09:00:00Z",
        read: true,
      },
      {
        id: "msg-2",
        patientId: "p-1",
        sender: "Patient",
        body: "Thank you, Doctor. Can we arrange a follow-up appointment?",
        date: "2026-10-08T10:15:00Z",
        read: false,
      },
      {
        id: "msg-3",
        patientId: "p-2",
        sender: "Patient",
        body: "Hello Doctor, I have updated my contact details.",
        date: "2026-10-07T11:30:00Z",
        read: false,
      },
    ],
    notifications: [
      {
        id: "n-1",
        title: "New patient connection request",
        message: "Heba Mansour would like to connect with you.",
        date: "2026-10-08T14:00:00Z",
        read: false,
        href: "/requests",
      },
      {
        id: "n-2",
        title: "Assessment awaiting review",
        message: "Ahmed Ali submitted a new demo assessment.",
        date: "2026-10-08T10:00:00Z",
        read: false,
        href: "/assessments/a-3",
      },
      {
        id: "n-3",
        title: "Additional information submitted",
        message: "Michael Chen shared updated patient context.",
        date: "2026-10-07T09:00:00Z",
        read: false,
        href: "/patients/p-3",
      },
      {
        id: "n-4",
        title: "Review completed",
        message: "Sarah Johnson assessment has been reviewed.",
        date: "2026-10-06T11:00:00Z",
        read: true,
        href: "/assessments/a-6",
      },
    ],
    activities: [
      {
        id: "e-1",
        patientId: "p-1",
        assessmentId: "a-3",
        title: "Mobile assessment received",
        detail: "Ahmed Ali submitted illustrative assessment inputs.",
        date: "2026-10-08T10:00:00Z",
      },
      {
        id: "e-2",
        patientId: "p-2",
        assessmentId: "a-6",
        title: "Assessment reviewed",
        detail: "Dr. Emily Chen completed a demo review for Sarah Johnson.",
        date: "2026-10-07T11:00:00Z",
      },
      {
        id: "e-3",
        title: "Connection requested",
        detail: "Heba Mansour requested access to the doctor portal.",
        date: "2026-10-06T14:00:00Z",
      },
    ],
  });
}
