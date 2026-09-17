export type Patient = {
  id: string
  name: string
  dob: string
  age: number
  sex: "M" | "F"
  cohort: string
  diagnosis: string
  creatinine: string
  trial_id?: string
  medications?: string[]
  clinical_data?: Record<string, any>
  report_history?: any[]
}

export const PATIENTS: Patient[] = [
  {
    id: "PT-4471-0293",
    name: "Eleanor Vance",
    dob: "1958-03-14",
    age: 67,
    sex: "F",
    cohort: "Cohort B - Dose Escalation",
    diagnosis: "Stage III Renal Cell Carcinoma",
    creatinine: "1.9 mg/dL",
    trial_id: "NCT02415400",
    medications: ["Apixaban 5mg BID"],
  },
  {
    id: "PT-8821-4412",
    name: "Marcus Delgado",
    dob: "1971-11-02",
    age: 54,
    sex: "M",
    cohort: "Cohort A - Standard Dose",
    diagnosis: "Metastatic Colorectal Adenocarcinoma",
    creatinine: "1.1 mg/dL",
    trial_id: "NCT00781573",
    medications: ["Apixaban 5mg BID", "Clopidogrel 75mg daily"],
  },
  {
    id: "PT-1092-9934",
    name: "Priya Nair",
    dob: "1983-06-27",
    age: 42,
    sex: "F",
    cohort: "Cohort B - Dose Escalation",
    diagnosis: "Hepatocellular Carcinoma",
    creatinine: "1.4 mg/dL",
    trial_id: "NCT00809965",
    medications: ["Pioglitazone 30mg daily"],
  },
  {
    id: "PT-3310-7781",
    name: "James Okafor",
    dob: "1965-09-19",
    age: 60,
    sex: "M",
    cohort: "Cohort C - Maintenance",
    diagnosis: "Non-Small Cell Lung Carcinoma",
    creatinine: "1.0 mg/dL",
    trial_id: "NCT02415400",
    medications: ["Pembrolizumab 200mg IV Q3W"],
  },
]

export const PROTOCOLS = [
  "NCT02415400 - Phase II Antithrombotic Trial (Arm A: Apixaban 5mg BID)",
  "NCT02415400 - Cohort C Solid Tumor Oncology (Pembrolizumab 200mg Q3W)",
  "NCT00781573 - Post-PCI Dual Therapy Protocol (Arm A)",
  "NCT00699998 - Renal Stratification SGLT2i Study (Cohort B)",
  "NCT00809965 - NAFLD / MASH Dose Escalation Protocol (Cohort B)",
  "FDA-CTP-2024-1187 (Phase II Renal Safety)",
  "FDA-CTP-2023-0941 (Phase I Dose Finding)",
]

export type AgentStatus = "pending" | "processing" | "completed"

export type AgentCard = {
  name: string
  status: AgentStatus
  description: string
  callout: string
  subtext?: string
  latency?: string
  confidence?: string
}

export const AGENTS: AgentCard[] = [
  {
    name: "Protocol Compliance Agent",
    status: "pending",
    description: "Validates telemetry against FDA inclusion/exclusion criteria.",
    callout: ".",
    latency: "",
    confidence: "",
  },
  {
    name: "Financial Risk Agent",
    status: "pending",
    description: "Projects reimbursement exposure and SAE liability.",
    callout: "",
    latency: "",
    confidence: "",
  },
  {
    name: "Safety & Toxicity Agent",
    status: "pending",
    description: "Evaluates drug-drug interactions & metabolic clearance markers.",
    callout: "",
    latency: "",
    confidence: "",
  },
  {
    name: "Arbitration Reducer",
    status: "pending",
    description: "Reconciles parallel agent inputs into a single consensus recommendation.",
    callout: ".",
    subtext: "",
  },
]
