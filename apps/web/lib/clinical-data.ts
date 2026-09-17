export type Patient = {
  id: string
  name: string
  dob: string
  age: number
  sex: string
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
  {
    id: "P034",
    name: "Elena Rostova",
    dob: "Unrecorded",
    age: 0,
    sex: "",
    cohort: "Cohort A - [G1 Ingress Failure] Missing Demographics",
    diagnosis: "Non-valvular atrial fibrillation",
    creatinine: "CrCl 65 mL/min",
    trial_id: "NCT02415400",
    medications: ["Apixaban 5mg BID"],
    clinical_data: {
      patient_id: "P034",
      name: "Elena Rostova",
      age: null,
      sex: "",
      dob: "Unrecorded",
      diagnoses: ["Non-valvular atrial fibrillation"],
      medications: ["Apixaban 5mg BID"],
      lab_results: {
        creatinine_clearance: { value: 65.0, unit: "mL/min" },
        serum_creatinine: { value: 1.0, unit: "mg/dL" },
        ALT: { value: 24.0, unit: "U/L" },
        AST: { value: 22.0, unit: "U/L" },
      },
    },
  },
  {
    id: "P035",
    name: "Kavita Sharma",
    dob: "1974-05-18",
    age: 52,
    sex: "F",
    cohort: "Cohort B - [G2 Hard Boundary Breach] Catastrophic Hepatotoxicity",
    diagnosis: "MASH with bridging fibrosis",
    creatinine: "CrCl 58 mL/min",
    trial_id: "NCT00809965",
    medications: ["Pioglitazone 30mg daily"],
    clinical_data: {
      patient_id: "P035",
      name: "Kavita Sharma",
      age: 52,
      sex: "female",
      diagnoses: ["MASH with bridging fibrosis", "Acute drug-induced hepatotoxicity"],
      medications: ["Pioglitazone 30mg daily"],
      lab_results: {
        ALT: { value: 620.0, unit: "U/L" },
        AST: { value: 480.0, unit: "U/L" },
        total_bilirubin: { value: 4.5, unit: "mg/dL" },
        creatinine_clearance: { value: 58.0, unit: "mL/min" },
        serum_creatinine: { value: 1.1, unit: "mg/dL" },
      },
    },
  },
  {
    id: "P036",
    name: "Darius Vance",
    dob: "1958-11-12",
    age: 68,
    sex: "M",
    cohort: "Cohort A - [Protocol Non-Compliant] Overdose & Active Hemorrhage",
    diagnosis: "Non-valvular atrial fibrillation post-PCI",
    creatinine: "CrCl 42 mL/min",
    trial_id: "NCT02415400",
    medications: ["Apixaban 40mg BID", "Aspirin 325mg daily", "Clopidogrel 75mg daily"],
    clinical_data: {
      patient_id: "P036",
      name: "Darius Vance",
      age: 68,
      sex: "male",
      diagnoses: ["Non-valvular atrial fibrillation post-PCI", "Recent acute gastrointestinal hemorrhage"],
      medications: ["Apixaban 40mg BID", "Aspirin 325mg daily", "Clopidogrel 75mg daily"],
      protocol_facts: {
        ongoing_bleeding: true,
        days_since_major_bleed: 12,
        oral_anticoagulation_required: true,
      },
      lab_results: {
        creatinine_clearance: { value: 42.0, unit: "mL/min" },
        serum_creatinine: { value: 1.4, unit: "mg/dL" },
        ALT: { value: 32.0, unit: "U/L" },
        AST: { value: 29.0, unit: "U/L" },
        hemoglobin: { value: 9.2, unit: "g/dL" },
      },
    },
  },
  {
    id: "P037",
    name: "Mei-Ling Zhou",
    dob: "1965-02-24",
    age: 61,
    sex: "F",
    cohort: "Cohort C - [4 A2A Pipelines Rejection] Unapproved Dose & Multi-Organ Conflict",
    diagnosis: "Stage IV Non-Small Cell Lung Carcinoma",
    creatinine: "CrCl 52 mL/min",
    trial_id: "NCT02415400",
    medications: ["Pembrolizumab 400mg IV Q3W", "Ketoconazole 400mg daily", "Prednisone 40mg daily"],
    clinical_data: {
      patient_id: "P037",
      name: "Mei-Ling Zhou",
      age: 61,
      sex: "female",
      diagnoses: ["Stage IV Non-Small Cell Lung Carcinoma", "Grade 3 Immune-Related Colitis"],
      medications: ["Pembrolizumab 400mg IV Q3W", "Ketoconazole 400mg daily", "Prednisone 40mg daily"],
      protocol_facts: {
        active_autoimmune_disease: true,
        systemic_immunosuppression: true,
      },
      lab_results: {
        ANC: { value: 1200.0, unit: "/uL" },
        platelets: { value: 85000.0, unit: "/uL" },
        creatinine_clearance: { value: 52.0, unit: "mL/min" },
        serum_creatinine: { value: 1.2, unit: "mg/dL" },
        ALT: { value: 75.0, unit: "U/L" },
        AST: { value: 68.0, unit: "U/L" },
      },
    },
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
