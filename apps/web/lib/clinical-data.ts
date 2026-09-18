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
  {
    "id": "P038",
    "name": "Ananya Deshmukh",
    "dob": "1964-08-14",
    "age": 62,
    "sex": "",
    "cohort": "Cohort A - [G1 Ingress Failure] Missing Biological Sex",
    "diagnosis": "Non-valvular atrial fibrillation",
    "creatinine": "CrCl 68 mL/min",
    "trial_id": "NCT02415400",
    "medications": [
      "Apixaban 5mg BID",
      "Lisinopril 10mg daily"
    ],
    "clinical_data": {
      "patient_id": "P038",
      "name": "Ananya Deshmukh",
      "dob": "1964-08-14",
      "birth_date": "1964-08-14",
      "age": 62,
      "sex": "",
      "cohort": "Cohort A - [G1 Ingress Failure] Missing Biological Sex",
      "diagnoses": [
        "Non-valvular atrial fibrillation",
        "Essential hypertension"
      ],
      "medications": [
        "Apixaban 5mg BID",
        "Lisinopril 10mg daily"
      ],
      "medical_history": [
        "Catheter ablation 2021",
        "Appendectomy 1995"
      ],
      "medical_history_narrative": "62-year-old presenting for antithrombotic trial intake with unrecorded biological sex.",
      "protocol_facts": {
        "oral_anticoagulation_required": true,
        "ongoing_bleeding": false,
        "days_since_major_bleed": null
      },
      "lab_results": {
        "creatinine_clearance": {
          "value": 68.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 1.0,
          "unit": "mg/dL"
        },
        "eGFR": {
          "value": 72.0,
          "unit": "mL/min/1.73m2"
        },
        "ALT": {
          "value": 24.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 22.0,
          "unit": "U/L"
        },
        "total_bilirubin": {
          "value": 0.8,
          "unit": "mg/dL"
        },
        "ANC": {
          "value": 4100.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 230000.0,
          "unit": "/uL"
        },
        "hemoglobin": {
          "value": 13.8,
          "unit": "g/dL"
        },
        "INR": {
          "value": 1.1,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 72,
        "blood_pressure_systolic": 126,
        "blood_pressure_diastolic": 78
      }
    }
  },
  {
    "id": "P039",
    "name": "Robert Chen",
    "dob": "Unrecorded",
    "age": 0,
    "sex": "M",
    "cohort": "Cohort B - [G1 Ingress Failure] Missing Patient Age",
    "diagnosis": "Diabetic nephropathy stage 3a",
    "creatinine": "CrCl 58 mL/min",
    "trial_id": "NCT00699998",
    "medications": [
      "Empagliflozin 10mg daily",
      "Metformin 500mg BID"
    ],
    "clinical_data": {
      "patient_id": "P039",
      "name": "Robert Chen",
      "dob": "Unrecorded",
      "birth_date": null,
      "age": 0,
      "sex": "male",
      "cohort": "Cohort B - [G1 Ingress Failure] Missing Patient Age",
      "diagnoses": [
        "Diabetic nephropathy stage 3a",
        "Type 2 diabetes mellitus"
      ],
      "medications": [
        "Empagliflozin 10mg daily",
        "Metformin 500mg BID"
      ],
      "medical_history": [
        "Type 2 diabetes for 12 years",
        "Laser photocoagulation 2018"
      ],
      "medical_history_narrative": "Male subject with diabetic nephropathy missing birth date and age records.",
      "protocol_facts": {
        "dialysis_required": false
      },
      "lab_results": {
        "creatinine_clearance": {
          "value": 58.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 1.3,
          "unit": "mg/dL"
        },
        "eGFR": {
          "value": 60.0,
          "unit": "mL/min/1.73m2"
        },
        "ALT": {
          "value": 28.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 25.0,
          "unit": "U/L"
        },
        "total_bilirubin": {
          "value": 0.7,
          "unit": "mg/dL"
        },
        "ANC": {
          "value": 4500.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 250000.0,
          "unit": "/uL"
        },
        "hemoglobin": {
          "value": 13.2,
          "unit": "g/dL"
        },
        "INR": {
          "value": 1.0,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 76,
        "blood_pressure_systolic": 130,
        "blood_pressure_diastolic": 82
      }
    }
  },
  {
    "id": "P040",
    "name": "Fatima Al-Mansoor",
    "dob": "Unrecorded",
    "age": 0,
    "sex": "",
    "cohort": "Cohort C - [G1 Ingress Failure] Missing Age & Sex (21 CFR 312.62)",
    "diagnosis": "Colorectal adenocarcinoma (Stage IIIA)",
    "creatinine": "CrCl 62 mL/min",
    "trial_id": "NCT02415400",
    "medications": [
      "Capecitabine 1000mg BID",
      "Ondansetron 8mg PRN"
    ],
    "clinical_data": {
      "patient_id": "P040",
      "name": "Fatima Al-Mansoor",
      "dob": "Unrecorded",
      "birth_date": null,
      "age": 0,
      "sex": "",
      "cohort": "Cohort C - [G1 Ingress Failure] Missing Age & Sex (21 CFR 312.62)",
      "diagnoses": [
        "Colorectal adenocarcinoma (Stage IIIA)",
        "Anemia of chronic disease"
      ],
      "medications": [
        "Capecitabine 1000mg BID",
        "Ondansetron 8mg PRN"
      ],
      "medical_history": [
        "Partial colectomy 2023"
      ],
      "medical_history_narrative": "Oncology patient transferred from outside facility without demographic identity attributes.",
      "protocol_facts": {
        "active_autoimmune_disease": false,
        "systemic_immunosuppression": false
      },
      "lab_results": {
        "creatinine_clearance": {
          "value": 62.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 1.1,
          "unit": "mg/dL"
        },
        "eGFR": {
          "value": 68.0,
          "unit": "mL/min/1.73m2"
        },
        "ALT": {
          "value": 26.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 23.0,
          "unit": "U/L"
        },
        "total_bilirubin": {
          "value": 0.6,
          "unit": "mg/dL"
        },
        "ANC": {
          "value": 3600.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 210000.0,
          "unit": "/uL"
        },
        "hemoglobin": {
          "value": 11.2,
          "unit": "g/dL"
        },
        "INR": {
          "value": 1.1,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 78,
        "blood_pressure_systolic": 118,
        "blood_pressure_diastolic": 74
      }
    }
  },
  {
    "id": "P041",
    "name": "Vikram Malhotra",
    "dob": "1955-04-12",
    "age": 71,
    "sex": "M",
    "cohort": "Cohort B - [G2 Hard Boundary Breach] Catastrophic Renal Collapse",
    "diagnosis": "End-stage diabetic glomerulosclerosis",
    "creatinine": "CrCl 12 mL/min",
    "trial_id": "NCT00699998",
    "medications": [
      "Empagliflozin 10mg daily",
      "Furosemide 80mg daily",
      "Sodium bicarbonate 650mg TID"
    ],
    "clinical_data": {
      "patient_id": "P041",
      "name": "Vikram Malhotra",
      "dob": "1955-04-12",
      "birth_date": "1955-04-12",
      "age": 71,
      "sex": "male",
      "cohort": "Cohort B - [G2 Hard Boundary Breach] Catastrophic Renal Collapse",
      "diagnoses": [
        "End-stage diabetic glomerulosclerosis",
        "Severe metabolic acidosis"
      ],
      "medications": [
        "Empagliflozin 10mg daily",
        "Furosemide 80mg daily",
        "Sodium bicarbonate 650mg TID"
      ],
      "medical_history": [
        "Acute-on-chronic renal injury",
        "Hypertensive nephrosclerosis"
      ],
      "medical_history_narrative": "71-year-old male with acute renal collapse triggering G2 ESRD stopping rules.",
      "protocol_facts": {
        "dialysis_required": true
      },
      "lab_results": {
        "eGFR": {
          "value": 11.0,
          "unit": "mL/min/1.73m2"
        },
        "creatinine_clearance": {
          "value": 12.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 5.2,
          "unit": "mg/dL"
        },
        "ALT": {
          "value": 25.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 22.0,
          "unit": "U/L"
        },
        "total_bilirubin": {
          "value": 1.1,
          "unit": "mg/dL"
        },
        "ANC": {
          "value": 4200.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 180000.0,
          "unit": "/uL"
        },
        "hemoglobin": {
          "value": 8.9,
          "unit": "g/dL"
        },
        "INR": {
          "value": 1.2,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 84,
        "blood_pressure_systolic": 158,
        "blood_pressure_diastolic": 96
      }
    }
  },
  {
    "id": "P042",
    "name": "Zoe Washington",
    "dob": "1968-09-22",
    "age": 58,
    "sex": "F",
    "cohort": "Cohort B - [G2 Hard Boundary Breach] Severe Hyperbilirubinemia & Liver Collapse",
    "diagnosis": "Decompensated MASH cirrhosis with jaundice",
    "creatinine": "CrCl 54 mL/min",
    "trial_id": "NCT00809965",
    "medications": [
      "Pioglitazone 30mg daily",
      "Spironolactone 50mg daily",
      "Lactulose 20g daily"
    ],
    "clinical_data": {
      "patient_id": "P042",
      "name": "Zoe Washington",
      "dob": "1968-09-22",
      "birth_date": "1968-09-22",
      "age": 58,
      "sex": "female",
      "cohort": "Cohort B - [G2 Hard Boundary Breach] Severe Hyperbilirubinemia & Liver Collapse",
      "diagnoses": [
        "Decompensated MASH cirrhosis with jaundice",
        "Hepatic coagulopathy"
      ],
      "medications": [
        "Pioglitazone 30mg daily",
        "Spironolactone 50mg daily",
        "Lactulose 20g daily"
      ],
      "medical_history": [
        "Ascites requiring paracentesis 2023",
        "Portal hypertension"
      ],
      "medical_history_narrative": "58-year-old female with acute-on-chronic hepatic failure, icterus, and profound transaminitis.",
      "protocol_facts": {
        "prior_bleeding": false,
        "ongoing_bleeding": false
      },
      "lab_results": {
        "total_bilirubin": {
          "value": 6.8,
          "unit": "mg/dL"
        },
        "ALT": {
          "value": 310.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 285.0,
          "unit": "U/L"
        },
        "creatinine_clearance": {
          "value": 54.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 1.3,
          "unit": "mg/dL"
        },
        "eGFR": {
          "value": 56.0,
          "unit": "mL/min/1.73m2"
        },
        "ANC": {
          "value": 3500.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 92000.0,
          "unit": "/uL"
        },
        "hemoglobin": {
          "value": 10.8,
          "unit": "g/dL"
        },
        "INR": {
          "value": 2.1,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 88,
        "blood_pressure_systolic": 112,
        "blood_pressure_diastolic": 68
      }
    }
  },
  {
    "id": "P043",
    "name": "Suresh Patel",
    "dob": "1962-01-30",
    "age": 64,
    "sex": "M",
    "cohort": "Cohort C - [G2 Hard Boundary Breach] Severe Agranulocytosis & Marrow Failure",
    "diagnosis": "Metastatic NSCLC post-myeloablative chemo",
    "creatinine": "CrCl 65 mL/min",
    "trial_id": "NCT02415400",
    "medications": [
      "Pembrolizumab 200mg IV Q3W",
      "Filgrastim 300mcg SubQ",
      "Cefepime 2g IV Q8H"
    ],
    "clinical_data": {
      "patient_id": "P043",
      "name": "Suresh Patel",
      "dob": "1962-01-30",
      "birth_date": "1962-01-30",
      "age": 64,
      "sex": "male",
      "cohort": "Cohort C - [G2 Hard Boundary Breach] Severe Agranulocytosis & Marrow Failure",
      "diagnoses": [
        "Metastatic NSCLC post-myeloablative chemo",
        "Febrile neutropenia"
      ],
      "medications": [
        "Pembrolizumab 200mg IV Q3W",
        "Filgrastim 300mcg SubQ",
        "Cefepime 2g IV Q8H"
      ],
      "medical_history": [
        "Carboplatin + Pemetrexed cycle 4 10 days ago"
      ],
      "medical_history_narrative": "64-year-old male with profound agranulocytosis triggering G2 safety stopping rule.",
      "protocol_facts": {
        "active_autoimmune_disease": false,
        "systemic_immunosuppression": false
      },
      "lab_results": {
        "ANC": {
          "value": 320.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 28000.0,
          "unit": "/uL"
        },
        "creatinine_clearance": {
          "value": 65.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 1.1,
          "unit": "mg/dL"
        },
        "eGFR": {
          "value": 70.0,
          "unit": "mL/min/1.73m2"
        },
        "ALT": {
          "value": 32.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 28.0,
          "unit": "U/L"
        },
        "total_bilirubin": {
          "value": 0.9,
          "unit": "mg/dL"
        },
        "hemoglobin": {
          "value": 8.4,
          "unit": "g/dL"
        },
        "INR": {
          "value": 1.1,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 102,
        "blood_pressure_systolic": 108,
        "blood_pressure_diastolic": 64
      }
    }
  },
  {
    "id": "P044",
    "name": "Claire Dubois",
    "dob": "1960-07-04",
    "age": 66,
    "sex": "F",
    "cohort": "Cohort A - [RAG Rule Violation] Massive Overdose (60 mg BID)",
    "diagnosis": "Non-valvular atrial fibrillation",
    "creatinine": "CrCl 70 mL/min",
    "trial_id": "NCT02415400",
    "medications": [
      "Apixaban 60mg BID",
      "Atorvastatin 40mg daily"
    ],
    "clinical_data": {
      "patient_id": "P044",
      "name": "Claire Dubois",
      "dob": "1960-07-04",
      "birth_date": "1960-07-04",
      "age": 66,
      "sex": "female",
      "cohort": "Cohort A - [RAG Rule Violation] Massive Overdose (60 mg BID)",
      "diagnoses": [
        "Non-valvular atrial fibrillation",
        "Dyslipidemia"
      ],
      "medications": [
        "Apixaban 60mg BID",
        "Atorvastatin 40mg daily"
      ],
      "medical_history": [
        "Transient ischemic attack 2022",
        "Cholecystectomy 2014"
      ],
      "medical_history_narrative": "66-year-old female with unapproved 12-fold supratherapeutic prescription.",
      "protocol_facts": {
        "ongoing_bleeding": false,
        "days_since_major_bleed": null,
        "oral_anticoagulation_required": true
      },
      "lab_results": {
        "creatinine_clearance": {
          "value": 70.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 0.9,
          "unit": "mg/dL"
        },
        "eGFR": {
          "value": 75.0,
          "unit": "mL/min/1.73m2"
        },
        "ALT": {
          "value": 28.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 24.0,
          "unit": "U/L"
        },
        "total_bilirubin": {
          "value": 0.8,
          "unit": "mg/dL"
        },
        "ANC": {
          "value": 4200.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 240000.0,
          "unit": "/uL"
        },
        "hemoglobin": {
          "value": 14.1,
          "unit": "g/dL"
        },
        "INR": {
          "value": 1.1,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 70,
        "blood_pressure_systolic": 122,
        "blood_pressure_diastolic": 76
      }
    }
  },
  {
    "id": "P045",
    "name": "Tariq Mahmoud",
    "dob": "1957-03-19",
    "age": 69,
    "sex": "M",
    "cohort": "Cohort A - [RAG Rule Violation] Acute GI Bleed Washout (8 Days)",
    "diagnosis": "Atrial fibrillation post-ablation",
    "creatinine": "CrCl 58 mL/min",
    "trial_id": "NCT02415400",
    "medications": [
      "Apixaban 5mg BID",
      "Pantoprazole 40mg daily"
    ],
    "clinical_data": {
      "patient_id": "P045",
      "name": "Tariq Mahmoud",
      "dob": "1957-03-19",
      "birth_date": "1957-03-19",
      "age": 69,
      "sex": "male",
      "cohort": "Cohort A - [RAG Rule Violation] Acute GI Bleed Washout (8 Days)",
      "diagnoses": [
        "Atrial fibrillation post-ablation",
        "Recent peptic ulcer hemorrhage"
      ],
      "medications": [
        "Apixaban 5mg BID",
        "Pantoprazole 40mg daily"
      ],
      "medical_history": [
        "Acute lower GI hemorrhage requiring 2 units PRBC 8 days ago"
      ],
      "medical_history_narrative": "69-year-old male with recent major bleed 8 days prior, violating 30-day washout rule.",
      "protocol_facts": {
        "ongoing_bleeding": true,
        "days_since_major_bleed": 8,
        "oral_anticoagulation_required": true
      },
      "lab_results": {
        "creatinine_clearance": {
          "value": 58.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 1.2,
          "unit": "mg/dL"
        },
        "eGFR": {
          "value": 64.0,
          "unit": "mL/min/1.73m2"
        },
        "ALT": {
          "value": 30.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 26.0,
          "unit": "U/L"
        },
        "total_bilirubin": {
          "value": 1.0,
          "unit": "mg/dL"
        },
        "ANC": {
          "value": 4600.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 215000.0,
          "unit": "/uL"
        },
        "hemoglobin": {
          "value": 10.4,
          "unit": "g/dL"
        },
        "INR": {
          "value": 1.1,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 74,
        "blood_pressure_systolic": 116,
        "blood_pressure_diastolic": 72
      }
    }
  },
  {
    "id": "P046",
    "name": "Devraj Sengupta",
    "dob": "1953-12-08",
    "age": 73,
    "sex": "M",
    "cohort": "Cohort B - [RAG Rule Violation] Renal Trial Floor Exclusion (CrCl 22 mL/min)",
    "diagnosis": "Diabetic nephropathy with reduced filtration",
    "creatinine": "CrCl 22 mL/min",
    "trial_id": "NCT00699998",
    "medications": [
      "Empagliflozin 10mg daily",
      "Amlodipine 5mg daily"
    ],
    "clinical_data": {
      "patient_id": "P046",
      "name": "Devraj Sengupta",
      "dob": "1953-12-08",
      "birth_date": "1953-12-08",
      "age": 73,
      "sex": "male",
      "cohort": "Cohort B - [RAG Rule Violation] Renal Trial Floor Exclusion (CrCl 22 mL/min)",
      "diagnoses": [
        "Diabetic nephropathy with reduced filtration",
        "Hypertension"
      ],
      "medications": [
        "Empagliflozin 10mg daily",
        "Amlodipine 5mg daily"
      ],
      "medical_history": [
        "Type 2 diabetes for 20 years",
        "Coronary artery bypass 2012"
      ],
      "medical_history_narrative": "73-year-old male with CrCl 22 mL/min below the >= 30 mL/min protocol floor.",
      "protocol_facts": {
        "dialysis_required": false
      },
      "lab_results": {
        "creatinine_clearance": {
          "value": 22.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 2.4,
          "unit": "mg/dL"
        },
        "eGFR": {
          "value": 24.0,
          "unit": "mL/min/1.73m2"
        },
        "ALT": {
          "value": 22.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 20.0,
          "unit": "U/L"
        },
        "total_bilirubin": {
          "value": 0.7,
          "unit": "mg/dL"
        },
        "ANC": {
          "value": 3900.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 195000.0,
          "unit": "/uL"
        },
        "hemoglobin": {
          "value": 11.5,
          "unit": "g/dL"
        },
        "INR": {
          "value": 1.0,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 68,
        "blood_pressure_systolic": 134,
        "blood_pressure_diastolic": 80
      }
    }
  },
  {
    "id": "P047",
    "name": "Hannah Rosen",
    "dob": "1967-11-15",
    "age": 59,
    "sex": "F",
    "cohort": "Cohort C - [RAG Rule Violation] Active Autoimmune Disease Exclusion",
    "diagnosis": "Colorectal carcinoma",
    "creatinine": "CrCl 65 mL/min",
    "trial_id": "NCT02415400",
    "medications": [
      "Pembrolizumab 200mg IV Q3W",
      "Prednisone 30mg daily",
      "Mesalamine 2.4g daily"
    ],
    "clinical_data": {
      "patient_id": "P047",
      "name": "Hannah Rosen",
      "dob": "1967-11-15",
      "birth_date": "1967-11-15",
      "age": 59,
      "sex": "female",
      "cohort": "Cohort C - [RAG Rule Violation] Active Autoimmune Disease Exclusion",
      "diagnoses": [
        "Colorectal carcinoma",
        "Active Crohn's colitis on systemic steroid"
      ],
      "medications": [
        "Pembrolizumab 200mg IV Q3W",
        "Prednisone 30mg daily",
        "Mesalamine 2.4g daily"
      ],
      "medical_history": [
        "Crohn's disease for 8 years",
        "Right hemicolectomy 2022"
      ],
      "medical_history_narrative": "59-year-old female with active autoimmune bowel disease contraindicating checkpoint inhibitor.",
      "protocol_facts": {
        "active_autoimmune_disease": true,
        "systemic_immunosuppression": true
      },
      "lab_results": {
        "creatinine_clearance": {
          "value": 65.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 1.0,
          "unit": "mg/dL"
        },
        "eGFR": {
          "value": 72.0,
          "unit": "mL/min/1.73m2"
        },
        "ALT": {
          "value": 26.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 24.0,
          "unit": "U/L"
        },
        "total_bilirubin": {
          "value": 0.8,
          "unit": "mg/dL"
        },
        "ANC": {
          "value": 3900.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 230000.0,
          "unit": "/uL"
        },
        "hemoglobin": {
          "value": 12.8,
          "unit": "g/dL"
        },
        "INR": {
          "value": 1.0,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 76,
        "blood_pressure_systolic": 120,
        "blood_pressure_diastolic": 75
      }
    }
  },
  {
    "id": "P048",
    "name": "Carlos Mendoza",
    "dob": "1963-06-25",
    "age": 63,
    "sex": "M",
    "cohort": "Cohort A - [A2A Safety Rejection] Fatal Dual CYP3A4 / P-gp Interaction",
    "diagnosis": "Non-valvular atrial fibrillation",
    "creatinine": "CrCl 68 mL/min",
    "trial_id": "NCT02415400",
    "medications": [
      "Apixaban 5mg BID",
      "Ketoconazole 400mg daily",
      "Clarithromycin 500mg BID"
    ],
    "clinical_data": {
      "patient_id": "P048",
      "name": "Carlos Mendoza",
      "dob": "1963-06-25",
      "birth_date": "1963-06-25",
      "age": 63,
      "sex": "male",
      "cohort": "Cohort A - [A2A Safety Rejection] Fatal Dual CYP3A4 / P-gp Interaction",
      "diagnoses": [
        "Non-valvular atrial fibrillation",
        "Systemic fungal infection"
      ],
      "medications": [
        "Apixaban 5mg BID",
        "Ketoconazole 400mg daily",
        "Clarithromycin 500mg BID"
      ],
      "medical_history": [
        "Histoplasmosis 2024",
        "Coronary angioplasty 2019"
      ],
      "medical_history_narrative": "63-year-old male with severe pharmacokinetic CYP3A4 + P-gp drug interaction resulting in anticoagulant toxicity.",
      "protocol_facts": {
        "ongoing_bleeding": false,
        "days_since_major_bleed": null,
        "oral_anticoagulation_required": true
      },
      "lab_results": {
        "creatinine_clearance": {
          "value": 68.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 1.1,
          "unit": "mg/dL"
        },
        "eGFR": {
          "value": 74.0,
          "unit": "mL/min/1.73m2"
        },
        "ALT": {
          "value": 35.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 30.0,
          "unit": "U/L"
        },
        "total_bilirubin": {
          "value": 1.1,
          "unit": "mg/dL"
        },
        "ANC": {
          "value": 4200.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 220000.0,
          "unit": "/uL"
        },
        "hemoglobin": {
          "value": 14.2,
          "unit": "g/dL"
        },
        "INR": {
          "value": 1.2,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 78,
        "blood_pressure_systolic": 128,
        "blood_pressure_diastolic": 82
      }
    }
  },
  {
    "id": "P049",
    "name": "Aditi Joshi",
    "dob": "1971-08-30",
    "age": 55,
    "sex": "F",
    "cohort": "Cohort C - [A2A Financial Denial] Unapproved Biologic Off-Label Billing ($52,800)",
    "diagnosis": "Refractory leiomyosarcoma (exploratory off-label arm)",
    "creatinine": "CrCl 72 mL/min",
    "trial_id": "NCT02415400",
    "medications": [
      "Pembrolizumab 200mg IV Q3W",
      "Amlodipine 5mg daily"
    ],
    "clinical_data": {
      "patient_id": "P049",
      "name": "Aditi Joshi",
      "dob": "1971-08-30",
      "birth_date": "1971-08-30",
      "age": 55,
      "sex": "female",
      "cohort": "Cohort C - [A2A Financial Denial] Unapproved Biologic Off-Label Billing ($52,800)",
      "diagnoses": [
        "Refractory leiomyosarcoma (exploratory off-label arm)",
        "Hypertension"
      ],
      "medications": [
        "Pembrolizumab 200mg IV Q3W",
        "Amlodipine 5mg daily"
      ],
      "medical_history": [
        "Surgical resection of pelvic sarcoma 2021"
      ],
      "medical_history_narrative": "55-year-old female in exploratory off-label cohort resulting in complete sponsor reimbursement denial ($52,800 liability).",
      "protocol_facts": {
        "active_autoimmune_disease": false,
        "systemic_immunosuppression": false
      },
      "lab_results": {
        "creatinine_clearance": {
          "value": 72.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 0.9,
          "unit": "mg/dL"
        },
        "eGFR": {
          "value": 78.0,
          "unit": "mL/min/1.73m2"
        },
        "ALT": {
          "value": 25.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 22.0,
          "unit": "U/L"
        },
        "total_bilirubin": {
          "value": 0.7,
          "unit": "mg/dL"
        },
        "ANC": {
          "value": 4500.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 260000.0,
          "unit": "/uL"
        },
        "hemoglobin": {
          "value": 13.5,
          "unit": "g/dL"
        },
        "INR": {
          "value": 1.0,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 72,
        "blood_pressure_systolic": 124,
        "blood_pressure_diastolic": 76
      }
    }
  },
  {
    "id": "P050",
    "name": "Benjamin Sterling",
    "dob": "1952-05-14",
    "age": 74,
    "sex": "M",
    "cohort": "Cohort A - [A2A Multi-Specialist Dissent] Triple Antiplatelet Hemorrhage Hazard & Prior Auth",
    "diagnosis": "Post-PCI with complex bifurcation stenting",
    "creatinine": "CrCl 52 mL/min",
    "trial_id": "NCT00781573",
    "medications": [
      "Apixaban 5mg BID",
      "Aspirin 81mg daily",
      "Clopidogrel 75mg daily",
      "Ticagrelor 90mg BID"
    ],
    "clinical_data": {
      "patient_id": "P050",
      "name": "Benjamin Sterling",
      "dob": "1952-05-14",
      "birth_date": "1952-05-14",
      "age": 74,
      "sex": "male",
      "cohort": "Cohort A - [A2A Multi-Specialist Dissent] Triple Antiplatelet Hemorrhage Hazard & Prior Auth",
      "diagnoses": [
        "Post-PCI with complex bifurcation stenting",
        "Atrial fibrillation"
      ],
      "medications": [
        "Apixaban 5mg BID",
        "Aspirin 81mg daily",
        "Clopidogrel 75mg daily",
        "Ticagrelor 90mg BID"
      ],
      "medical_history": [
        "DES placement LAD and LCx 2024",
        "Hypertension 25 years"
      ],
      "medical_history_narrative": "74-year-old male with unapproved triple antiplatelet combination causing safety dissent and $6,400 billing dispute.",
      "protocol_facts": {
        "pci_pathway": true,
        "days_since_PCI": 14,
        "ongoing_bleeding": false,
        "oral_anticoagulation_required": true
      },
      "lab_results": {
        "creatinine_clearance": {
          "value": 52.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 1.3,
          "unit": "mg/dL"
        },
        "eGFR": {
          "value": 55.0,
          "unit": "mL/min/1.73m2"
        },
        "ALT": {
          "value": 30.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 28.0,
          "unit": "U/L"
        },
        "total_bilirubin": {
          "value": 0.9,
          "unit": "mg/dL"
        },
        "ANC": {
          "value": 3800.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 155000.0,
          "unit": "/uL"
        },
        "hemoglobin": {
          "value": 12.9,
          "unit": "g/dL"
        },
        "INR": {
          "value": 1.1,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 74,
        "blood_pressure_systolic": 132,
        "blood_pressure_diastolic": 82
      }
    }
  },
  {
    "id": "P051",
    "name": "Lakshmi Ramanathan",
    "dob": "1961-09-17",
    "age": 65,
    "sex": "F",
    "cohort": "Cohort A - [All Pass: Unanimous Justified] Standard Atrial Fibrillation",
    "diagnosis": "Non-valvular atrial fibrillation post-flutter ablation",
    "creatinine": "CrCl 74 mL/min",
    "trial_id": "NCT02415400",
    "medications": [
      "Apixaban 5mg BID",
      "Metoprolol succinate 50mg daily"
    ],
    "clinical_data": {
      "patient_id": "P051",
      "name": "Lakshmi Ramanathan",
      "dob": "1961-09-17",
      "birth_date": "1961-09-17",
      "age": 65,
      "sex": "female",
      "cohort": "Cohort A - [All Pass: Unanimous Justified] Standard Atrial Fibrillation",
      "diagnoses": [
        "Non-valvular atrial fibrillation post-flutter ablation"
      ],
      "medications": [
        "Apixaban 5mg BID",
        "Metoprolol succinate 50mg daily"
      ],
      "medical_history": [
        "Atrial flutter ablation 2023"
      ],
      "medical_history_narrative": "65-year-old female fully eligible for antithrombotic arm. All guardrails and agents unanimous pass.",
      "protocol_facts": {
        "oral_anticoagulation_required": true,
        "ongoing_bleeding": false,
        "days_since_major_bleed": null,
        "history_of_intracranial_hemorrhage": false
      },
      "lab_results": {
        "creatinine_clearance": {
          "value": 74.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 0.9,
          "unit": "mg/dL"
        },
        "eGFR": {
          "value": 78.0,
          "unit": "mL/min/1.73m2"
        },
        "ALT": {
          "value": 22.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 20.0,
          "unit": "U/L"
        },
        "total_bilirubin": {
          "value": 0.7,
          "unit": "mg/dL"
        },
        "ANC": {
          "value": 4400.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 245000.0,
          "unit": "/uL"
        },
        "hemoglobin": {
          "value": 14.0,
          "unit": "g/dL"
        },
        "INR": {
          "value": 1.1,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 68,
        "blood_pressure_systolic": 118,
        "blood_pressure_diastolic": 74
      }
    }
  },
  {
    "id": "P052",
    "name": "Alexander Wright",
    "dob": "1969-02-11",
    "age": 57,
    "sex": "M",
    "cohort": "Cohort C - [All Pass: Unanimous Justified] Solid Tumor Oncology",
    "diagnosis": "Stage IIIB Non-Small Cell Lung Carcinoma (PD-L1 > 50%)",
    "creatinine": "CrCl 75 mL/min",
    "trial_id": "NCT02415400",
    "medications": [
      "Pembrolizumab 200mg IV Q3W",
      "Ondansetron 8mg PRN"
    ],
    "clinical_data": {
      "patient_id": "P052",
      "name": "Alexander Wright",
      "dob": "1969-02-11",
      "birth_date": "1969-02-11",
      "age": 57,
      "sex": "male",
      "cohort": "Cohort C - [All Pass: Unanimous Justified] Solid Tumor Oncology",
      "diagnoses": [
        "Stage IIIB Non-Small Cell Lung Carcinoma (PD-L1 > 50%)"
      ],
      "medications": [
        "Pembrolizumab 200mg IV Q3W",
        "Ondansetron 8mg PRN"
      ],
      "medical_history": [
        "Lobectomy 2022",
        "No autoimmune history"
      ],
      "medical_history_narrative": "57-year-old male with intact bone marrow reserve and organ clearance, fully protocol-compliant.",
      "protocol_facts": {
        "active_autoimmune_disease": false,
        "systemic_immunosuppression": false
      },
      "lab_results": {
        "ANC": {
          "value": 4200.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 260000.0,
          "unit": "/uL"
        },
        "creatinine_clearance": {
          "value": 75.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 0.95,
          "unit": "mg/dL"
        },
        "eGFR": {
          "value": 80.0,
          "unit": "mL/min/1.73m2"
        },
        "ALT": {
          "value": 24.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 21.0,
          "unit": "U/L"
        },
        "total_bilirubin": {
          "value": 0.8,
          "unit": "mg/dL"
        },
        "hemoglobin": {
          "value": 14.5,
          "unit": "g/dL"
        },
        "INR": {
          "value": 1.0,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 72,
        "blood_pressure_systolic": 122,
        "blood_pressure_diastolic": 76
      }
    }
  },
  {
    "id": "P053",
    "name": "Sneha Kulkarni",
    "dob": "1975-07-23",
    "age": 51,
    "sex": "F",
    "cohort": "Cohort B - [All Pass: Unanimous Justified] Metabolic NAFLD / MASH",
    "diagnosis": "MASH with Stage F2 fibrosis",
    "creatinine": "CrCl 78 mL/min",
    "trial_id": "NCT00809965",
    "medications": [
      "Pioglitazone 30mg daily",
      "Vitamin E 800 IU daily"
    ],
    "clinical_data": {
      "patient_id": "P053",
      "name": "Sneha Kulkarni",
      "dob": "1975-07-23",
      "birth_date": "1975-07-23",
      "age": 51,
      "sex": "female",
      "cohort": "Cohort B - [All Pass: Unanimous Justified] Metabolic NAFLD / MASH",
      "diagnoses": [
        "MASH with Stage F2 fibrosis",
        "Impaired fasting glucose"
      ],
      "medications": [
        "Pioglitazone 30mg daily",
        "Vitamin E 800 IU daily"
      ],
      "medical_history": [
        "Liver biopsy confirmed steatohepatitis 2023"
      ],
      "medical_history_narrative": "51-year-old female meeting all MASH protocol inclusion criteria with normal baseline transaminases.",
      "protocol_facts": {
        "prior_bleeding": false,
        "ongoing_bleeding": false
      },
      "lab_results": {
        "ALT": {
          "value": 34.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 29.0,
          "unit": "U/L"
        },
        "total_bilirubin": {
          "value": 0.9,
          "unit": "mg/dL"
        },
        "creatinine_clearance": {
          "value": 78.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 0.85,
          "unit": "mg/dL"
        },
        "eGFR": {
          "value": 82.0,
          "unit": "mL/min/1.73m2"
        },
        "ANC": {
          "value": 4100.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 240000.0,
          "unit": "/uL"
        },
        "hemoglobin": {
          "value": 13.6,
          "unit": "g/dL"
        },
        "INR": {
          "value": 1.0,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 70,
        "blood_pressure_systolic": 118,
        "blood_pressure_diastolic": 72
      }
    }
  },
  {
    "id": "P054",
    "name": "David Kim",
    "dob": "1963-10-05",
    "age": 63,
    "sex": "M",
    "cohort": "Cohort B - [All Pass: Unanimous Justified] Renal SGLT2i Stratification",
    "diagnosis": "Diabetic nephropathy stage 3a (preserved eGFR)",
    "creatinine": "CrCl 62 mL/min",
    "trial_id": "NCT00699998",
    "medications": [
      "Empagliflozin 10mg daily",
      "Losartan 50mg daily"
    ],
    "clinical_data": {
      "patient_id": "P054",
      "name": "David Kim",
      "dob": "1963-10-05",
      "birth_date": "1963-10-05",
      "age": 63,
      "sex": "male",
      "cohort": "Cohort B - [All Pass: Unanimous Justified] Renal SGLT2i Stratification",
      "diagnoses": [
        "Diabetic nephropathy stage 3a (preserved eGFR)",
        "Hypertension"
      ],
      "medications": [
        "Empagliflozin 10mg daily",
        "Losartan 50mg daily"
      ],
      "medical_history": [
        "Type 2 diabetes 14 years",
        "No cardiovascular events"
      ],
      "medical_history_narrative": "63-year-old male with preserved filtration conforming to SGLT2i protocol eligibility.",
      "protocol_facts": {
        "dialysis_required": false
      },
      "lab_results": {
        "eGFR": {
          "value": 58.0,
          "unit": "mL/min/1.73m2"
        },
        "creatinine_clearance": {
          "value": 62.0,
          "unit": "mL/min"
        },
        "serum_creatinine": {
          "value": 1.2,
          "unit": "mg/dL"
        },
        "ALT": {
          "value": 23.0,
          "unit": "U/L"
        },
        "AST": {
          "value": 21.0,
          "unit": "U/L"
        },
        "total_bilirubin": {
          "value": 0.8,
          "unit": "mg/dL"
        },
        "ANC": {
          "value": 4300.0,
          "unit": "/uL"
        },
        "platelets": {
          "value": 235000.0,
          "unit": "/uL"
        },
        "hemoglobin": {
          "value": 14.1,
          "unit": "g/dL"
        },
        "INR": {
          "value": 1.0,
          "unit": "ratio"
        }
      },
      "vital_signs": {
        "heart_rate": 72,
        "blood_pressure_systolic": 126,
        "blood_pressure_diastolic": 78
      }
    }
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
