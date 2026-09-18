"use client"

import {useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  Check,
  ChevronDown,
  Lock,
  Search,
  Send,
  User,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PROTOCOLS, PATIENTS } from "@/lib/clinical-data"
import { getPatientsFromSupabase } from "@/app/actions"
import { TrialGuardLogo } from "@/components/trialguard-logo"

export type Patient = {
  patient_id: string
  trial_id: string
  name: string
  dob: string
  age: number
  sex: string
  cohort: string
  diagnosis: string
  creatinine?: string
  medications?: string[]
  clinical_data?: Record<string, any>
  report_history: any[]
}

type IntakeViewProps = {
  onSubmit: (patient: Patient, protocol: string, action: string) => void
  disqualifiedIds?: string[]
}

export function IntakeView({ onSubmit, disqualifiedIds = [] }: IntakeViewProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Patient | null>(null)
  const [protocol, setProtocol] = useState(PROTOCOLS[0])
  const [action, setAction] = useState("Apixaban 5 mg oral twice daily")
  const containerRef = useRef<HTMLDivElement>(null)

  const isDisqualified = Boolean(selected && disqualifiedIds.includes(selected.patient_id))

  useEffect(() => {
    async function fetchPatients() {
      try {
        setIsLoading(true)
        let data: any = null

        // Try Supabase first
        try {
          data = await getPatientsFromSupabase()
        } catch (supabaseErr) {
          console.warn("Supabase fetch failed, trying local gateway /api/patients:", supabaseErr)
        }

        // Fall back to FastAPI gateway /api/patients
        if (!data || !Array.isArray(data) || data.length === 0) {
          try {
            const res = await fetch("http://localhost:8000/api/patients")
            if (res.ok) {
              data = await res.json()
            }
          } catch (gatewayErr) {
            console.warn("Gateway /api/patients fetch failed:", gatewayErr)
          }
        }

        // Fall back to local PATIENTS if remote endpoints are unavailable
        if (!data || !Array.isArray(data) || data.length === 0) {
          data = PATIENTS
        }

        if (data && Array.isArray(data) && data.length > 0) {
          const mapped: Patient[] = data.map((item: any) => {
            const clinical = item.clinical_data || item
            const labResults = clinical.lab_results || {}
            const crclObj = labResults.creatinine_clearance
            const scrObj = labResults.serum_creatinine
            const crclVal = typeof crclObj === "object" ? crclObj?.value : crclObj ?? item.creatinine_clearance ?? item.crcl
            const scrVal = typeof scrObj === "object" ? scrObj?.value : scrObj ?? item.serum_creatinine ?? item.creatinine
            let renalStr = "CrCl 55 mL/min"
            if (crclVal !== undefined && crclVal !== null) {
              renalStr = `CrCl ${crclVal} mL/min`
            } else if (scrVal && scrVal !== "unknown") {
              renalStr = `Serum Cr ${scrVal} mg/dL`
            }

            return {
              patient_id: String(item.patient_id || item.id || ""),
              trial_id: String(item.trial_id || item.assigned_demo_trial_id || "NCT02415400"),
              name: String(item.name || `Patient ${item.patient_id || item.id}`),
              dob: String(item.dob || item.birth_date || "1960-01-01"),
              age: item.age !== undefined && item.age !== null ? Number(item.age) : 0,
              sex: item.sex !== undefined && item.sex !== null ? String(item.sex) : "",
              cohort: String(item.cohort || "Cohort A"),
              diagnosis: String(item.diagnosis || (clinical.diagnoses ? clinical.diagnoses[0] : "Standard Protocol")),
              creatinine: renalStr,
              medications: Array.isArray(item.medications) ? item.medications : (clinical.medications || []),
              clinical_data: clinical,
              report_history: Array.isArray(item.report_history)
                ? item.report_history
                : Array.isArray(item.adjudication_reports)
                ? item.adjudication_reports
                : [],
            }
          })
          setPatients(mapped)
          if (mapped.length > 0) {
            choose(mapped[0])
          }
        }
      } catch (error) {
        console.error("Error fetching patients:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPatients()
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return patients
    return patients.filter(
      (p) =>
        p.patient_id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q),
    )
  }, [query, patients])

  function choose(patient: Patient) {
    setSelected(patient)
    setQuery(patient.name)
    setOpen(false)

    const pid = patient.patient_id || ""
    const meds = patient.medications || []
    const cohort = patient.cohort || ""
    const diagnosis = patient.diagnosis || ""
    const allText = `${cohort} ${diagnosis} ${meds.join(" ")}`.toLowerCase()

    // 1. Direct handler for Scenario Test Patients (G1, G2, RAG, A2A, and Clean Justified)
    const PRESETS: Record<string, { protocol: string; action: string }> = {
      P034: { protocol: "NCT02415400 - Phase II Antithrombotic Trial (Arm A: Apixaban 5mg BID)", action: "Apixaban 5 mg oral twice daily" },
      P038: { protocol: "NCT02415400 - Phase II Antithrombotic Trial (Arm A: Apixaban 5mg BID)", action: "Apixaban 5 mg oral twice daily" },
      P039: { protocol: "NCT00699998 - Renal Stratification SGLT2i Study (Cohort B)", action: "Empagliflozin 10 mg oral once daily" },
      P040: { protocol: "NCT02415400 - Cohort C Solid Tumor Oncology (Pembrolizumab 200mg Q3W)", action: "Capecitabine 1000 mg oral twice daily" },
      P035: { protocol: "NCT00809965 - NAFLD / MASH Dose Escalation Protocol (Cohort B)", action: "Pioglitazone 30 mg oral once daily" },
      P041: { protocol: "NCT00699998 - Renal Stratification SGLT2i Study (Cohort B)", action: "Empagliflozin 10 mg oral once daily" },
      P042: { protocol: "NCT00809965 - NAFLD / MASH Dose Escalation Protocol (Cohort B)", action: "Pioglitazone 30 mg oral once daily" },
      P043: { protocol: "NCT02415400 - Cohort C Solid Tumor Oncology (Pembrolizumab 200mg Q3W)", action: "Pembrolizumab 200 mg IV every 3 weeks" },
      P036: { protocol: "NCT02415400 - Phase II Antithrombotic Trial (Arm A: Apixaban 5mg BID)", action: "Apixaban 40 mg oral twice daily" },
      P044: { protocol: "NCT02415400 - Phase II Antithrombotic Trial (Arm A: Apixaban 5mg BID)", action: "Apixaban 60 mg oral twice daily" },
      P045: { protocol: "NCT02415400 - Phase II Antithrombotic Trial (Arm A: Apixaban 5mg BID)", action: "Apixaban 5 mg oral twice daily" },
      P046: { protocol: "NCT00699998 - Renal Stratification SGLT2i Study (Cohort B)", action: "Empagliflozin 10 mg oral once daily" },
      P047: { protocol: "NCT02415400 - Cohort C Solid Tumor Oncology (Pembrolizumab 200mg Q3W)", action: "Pembrolizumab 200 mg IV every 3 weeks" },
      P037: { protocol: "NCT02415400 - Cohort C Solid Tumor Oncology (Pembrolizumab 200mg Q3W)", action: "Pembrolizumab 400 mg IV every 3 weeks" },
      P048: { protocol: "NCT02415400 - Phase II Antithrombotic Trial (Arm A: Apixaban 5mg BID)", action: "Apixaban 5 mg oral twice daily" },
      P049: { protocol: "NCT02415400 - Cohort C Solid Tumor Oncology (Pembrolizumab 200mg Q3W)", action: "Pembrolizumab 200 mg IV every 3 weeks" },
      P050: { protocol: "NCT00781573 - Post-PCI Dual Therapy Protocol (Arm A)", action: "Apixaban 5 mg oral twice daily" },
      P051: { protocol: "NCT02415400 - Phase II Antithrombotic Trial (Arm A: Apixaban 5mg BID)", action: "Apixaban 5 mg oral twice daily" },
      P052: { protocol: "NCT02415400 - Cohort C Solid Tumor Oncology (Pembrolizumab 200mg Q3W)", action: "Pembrolizumab 200 mg IV every 3 weeks" },
      P053: { protocol: "NCT00809965 - NAFLD / MASH Dose Escalation Protocol (Cohort B)", action: "Pioglitazone 30 mg oral once daily" },
      P054: { protocol: "NCT00699998 - Renal Stratification SGLT2i Study (Cohort B)", action: "Empagliflozin 10 mg oral once daily" },
    }
    if (PRESETS[pid]) {
      setProtocol(PRESETS[pid].protocol)
      setAction(PRESETS[pid].action)
      return
    }

    // Synchronize protocol matching the patient's trial and clinical pathology
    let matchedProtocol: string | undefined
    if (allText.includes("oncology") || allText.includes("pembrolizumab") || allText.includes("carcinoma") || allText.includes("cancer")) {
      matchedProtocol = PROTOCOLS.find((p) => p.includes("Oncology")) || `${patient.trial_id} - Cohort C Solid Tumor Oncology`
    } else if (allText.includes("renal") || allText.includes("nephropathy") || allText.includes("empagliflozin") || patient.trial_id === "NCT00699998") {
      matchedProtocol = PROTOCOLS.find((p) => p.includes("Renal Stratification")) || `${patient.trial_id} - Cohort B Renal Stratification`
    } else if (allText.includes("nafld") || allText.includes("mash") || allText.includes("pioglitazone") || patient.trial_id === "NCT00809965") {
      matchedProtocol = PROTOCOLS.find((p) => p.includes("NAFLD / MASH")) || `${patient.trial_id} - Cohort B NAFLD Protocol`
    } else {
      matchedProtocol = PROTOCOLS.find((p) => p.startsWith(patient.trial_id)) || `${patient.trial_id} - ${patient.cohort}`
    }
    setProtocol(matchedProtocol)

    // Tailor default proposed action to the patient's clinical archetype and medications
    if (
      meds.some((m) => m.toLowerCase().includes("pembrolizumab")) ||
      allText.includes("oncology") ||
      allText.includes("carcinoma") ||
      allText.includes("cancer")
    ) {
      setAction("Pembrolizumab 200 mg IV every 3 weeks")
    } else if (
      meds.some((m) => m.toLowerCase().includes("empagliflozin")) ||
      allText.includes("renal") ||
      allText.includes("nephropathy") ||
      patient.trial_id === "NCT00699998"
    ) {
      setAction("Empagliflozin 10 mg oral once daily")
    } else if (
      meds.some((m) => m.toLowerCase().includes("pioglitazone")) ||
      allText.includes("nafld") ||
      allText.includes("mash") ||
      allText.includes("steatohepatitis") ||
      patient.trial_id === "NCT00809965"
    ) {
      setAction("Pioglitazone 30 mg oral once daily")
    } else if (
      meds.some((m) => m.toLowerCase().includes("apixaban")) ||
      allText.includes("atrial") ||
      patient.trial_id === "NCT00781573" ||
      patient.trial_id === "NCT02415400"
    ) {
      setAction("Apixaban 5 mg oral twice daily")
    } else {
      setAction("Apixaban 5 mg oral twice daily")
    }
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <header className="flex flex-wrap items-center justify-between border-b border-[#262626] bg-[#141414]/95 px-6 py-4 backdrop-blur gap-4">
        <TrialGuardLogo className="h-9 w-auto" showSubtitle />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 font-mono text-[11px] text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            <span>FHIR EMR Ingress Active</span>
          </div>
          <span className="rounded-full border border-[#2e2e2e] bg-[#1a1a1a] px-3.5 py-1 text-xs font-medium text-slate-300">
            Site 04 — Massachusetts General Hospital
          </span>
        </div>
      </header>

      <main className="px-4 pb-20 pt-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#2a2a2a] bg-[#161616] p-7 md:p-9 shadow-2xl space-y-7">
          <div className="border-b border-[#262626] pb-5">
            <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
              Initiate Patient Adjudication Session
            </h1>
            <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
              Query trial subjects from the EHR/FHIR repository, review baseline clinical telemetry, and submit proposed medication orders for autonomous multi-agent consensus review.
            </p>
          </div>

          {/* Patient lookup combobox */}
          <div className="mt-6">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Patient Lookup {isLoading && <Loader2 className="inline ml-2 size-3 animate-spin" />}
            </label>
            <div ref={containerRef} className="relative">
              <div className="flex items-center gap-2 rounded-lg border border-[#2e2e2e] bg-[#121212] px-3 focus-within:border-[#3b82f6]">
                <Search className="size-4 shrink-0 text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setOpen(true)
                    if (selected) setSelected(null)
                  }}
                  onFocus={() => setOpen(true)}
                  onBlur={() => window.setTimeout(() => setOpen(false), 150)}
                  placeholder={isLoading ? "Connecting to database..." : "Search by Patient ID or name…"}
                  disabled={isLoading}
                  className="h-10 w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
                  aria-label="Search patients"
                />
                <ChevronDown
                  className={`size-4 shrink-0 text-slate-500 transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </div>

              {open && (
                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[#2e2e2e] bg-[#1e1e1e] py-1 shadow-xl">
                  {results.length === 0 && (
                    <li className="px-3 py-4 text-center text-sm text-slate-500">
                      No matching patients.
                    </li>
                  )}
                  {results.map((p) => {
                    const isDisqualifiedItem = disqualifiedIds.includes(p.patient_id)
                    const isG1 = ["P034", "P038", "P039", "P040"].includes(p.patient_id)
                    const isG2 = ["P035", "P041", "P042", "P043"].includes(p.patient_id)
                    const isRagRule = ["P036", "P044", "P045", "P046", "P047"].includes(p.patient_id)
                    const isA2A = ["P037", "P048", "P049", "P050"].includes(p.patient_id)
                    const isClean = ["P051", "P052", "P053", "P054"].includes(p.patient_id)
                    const isNonAligned = isG1 || isG2 || isRagRule || isA2A

                    return (
                      <li key={p.patient_id}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            choose(p)
                          }}
                          className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[#2a2a2a] transition-colors ${
                            isDisqualifiedItem
                              ? "border-l-2 border-rose-600 bg-rose-950/20"
                              : isNonAligned
                              ? "border-l-2 border-amber-500/80 bg-[#161616]"
                              : isClean
                              ? "border-l-2 border-emerald-500/80 bg-emerald-950/10"
                              : ""
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <span
                              className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
                                isDisqualifiedItem
                                  ? "bg-rose-600/30 text-rose-300"
                                  : isG1 || isG2
                                  ? "bg-rose-500/20 text-rose-400"
                                  : isRagRule
                                  ? "bg-amber-500/20 text-amber-400"
                                  : isA2A
                                  ? "bg-purple-500/20 text-purple-400"
                                  : isClean
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-[#121212] text-slate-400"
                              }`}
                            >
                              {isDisqualifiedItem ? <Lock className="size-4" /> : <User className="size-4" />}
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="block text-sm font-medium text-white">
                                  {p.name}
                                </span>
                                {isDisqualifiedItem && (
                                  <span className="rounded bg-rose-600/30 px-1.5 py-0.5 font-mono text-[9px] font-bold text-rose-200 border border-rose-500/60">
                                    ⛔ Disqualified (3/3)
                                  </span>
                                )}
                                {!isDisqualifiedItem && isG1 && (
                                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-rose-300 border border-rose-500/30">
                                    G1 Ingress Failure
                                  </span>
                                )}
                                {isG2 && (
                                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-rose-300 border border-rose-500/30">
                                    G2 Boundary Breach
                                  </span>
                                )}
                                {isRagRule && (
                                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-300 border border-amber-500/30">
                                    Protocol Deviation
                                  </span>
                                )}
                                {isA2A && (
                                  <span className="rounded bg-purple-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-purple-300 border border-purple-500/30">
                                    4 A2A Rejection
                                  </span>
                                )}
                                {isClean && (
                                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                                    ✓ Justified Pass
                                  </span>
                                )}
                              </div>
                              <span className="block font-mono text-xs text-slate-500">
                                {p.patient_id} · {p.diagnosis}
                              </span>
                            </div>
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0 ${
                              isDisqualifiedItem
                                ? "border-rose-500/60 bg-rose-950/60 text-rose-300 font-bold"
                                : isG1 || isG2
                                ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                                : isRagRule
                                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                                : isA2A
                                ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                                : isClean
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-semibold"
                                : "border-[#2e2e2e] bg-[#121212] text-slate-300"
                            }`}
                          >
                            {isDisqualifiedItem
                              ? "Locked Out"
                              : isG1
                              ? "Ingress Test"
                              : isG2
                              ? "Safety Corridor"
                              : isRagRule
                              ? "RAG Dosing"
                              : isA2A
                              ? "A2A Consensus"
                              : isClean
                              ? "Clean Pass"
                              : p.cohort}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Selected patient details */}
          {selected && (
            <div className="rounded-xl border border-[#303030] bg-gradient-to-b from-[#181818] to-[#121212] p-5 md:p-6 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#262626] pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <Check className="size-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Subject Profile Loaded · Verified EMR Record
                  </span>
                </div>
                {["P034", "P038", "P039", "P040"].includes(selected.patient_id) && (
                  <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-rose-300">
                    TEST CASE: Guardrail-1 Ingress Failure
                  </span>
                )}
                {["P035", "P041", "P042", "P043"].includes(selected.patient_id) && (
                  <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-rose-300">
                    TEST CASE: Guardrail-2 Hard Boundary Breach
                  </span>
                )}
                {["P036", "P044", "P045", "P046", "P047"].includes(selected.patient_id) && (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                    TEST CASE: Protocol & RAG Rules Non-Compliance
                  </span>
                )}
                {["P037", "P048", "P049", "P050"].includes(selected.patient_id) && (
                  <span className="rounded-full border border-purple-500/40 bg-purple-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-purple-300">
                    TEST CASE: 4 A2A Pipelines Consensus Rejection
                  </span>
                )}
                {["P051", "P052", "P053", "P054"].includes(selected.patient_id) && (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                    TEST CASE: 100% Unanimous Justified Pass
                  </span>
                )}
              </div>

              {/* Specific Scenario Notice Box */}
              {selected.patient_id === "P034" && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3.5 text-xs text-rose-200 leading-relaxed space-y-1">
                  <strong className="text-rose-300">Mandatory Demographics Missing:</strong> Patient age is unrecorded and biological sex is empty. Designed to trigger <strong>Guardrail-1 Ingress Validation</strong> failure per 21 CFR 312.62. Clinician resupply console will activate during adjudication session.
                </div>
              )}
              {selected.patient_id === "P038" && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3.5 text-xs text-rose-200 leading-relaxed space-y-1">
                  <strong className="text-rose-300">Missing Biological Sex:</strong> Age is recorded (62 yrs), but biological sex is unrecorded. Triggers <strong>Guardrail-1 Ingress Failure</strong> requiring clinician sex specification.
                </div>
              )}
              {selected.patient_id === "P039" && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3.5 text-xs text-rose-200 leading-relaxed space-y-1">
                  <strong className="text-rose-300">Missing Patient Age:</strong> Sex is recorded (Male), but age/DOB is missing. Triggers <strong>Guardrail-1 Ingress Failure</strong> requiring clinician age specification for PK margin evaluation.
                </div>
              )}
              {selected.patient_id === "P040" && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3.5 text-xs text-rose-200 leading-relaxed space-y-1">
                  <strong className="text-rose-300">Multiple Ingress Deficits:</strong> Both age and biological sex are unrecorded. Triggers dual-attribute <strong>Guardrail-1 Ingress Failure</strong>.
                </div>
              )}
              {selected.patient_id === "P035" && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3.5 text-xs text-rose-200 leading-relaxed space-y-1">
                  <strong className="text-rose-300">Catastrophic Boundary Breach:</strong> ALT is <strong>620.0 U/L</strong> (&gt;5x ULN) and AST is <strong>480.0 U/L</strong>. Triggers <strong>Guardrail-2 Immediate Short-Circuit</strong> stopping drug administration.
                </div>
              )}
              {selected.patient_id === "P041" && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3.5 text-xs text-rose-200 leading-relaxed space-y-1">
                  <strong className="text-rose-300">Catastrophic Renal Failure:</strong> eGFR is <strong>11.0 mL/min/1.73m2</strong> (&lt; 15.0 ESRD floor) and serum creatinine is 5.2 mg/dL. Triggers <strong>Guardrail-2 Immediate Short-Circuit</strong>.
                </div>
              )}
              {selected.patient_id === "P042" && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3.5 text-xs text-rose-200 leading-relaxed space-y-1">
                  <strong className="text-rose-300">Severe Hyperbilirubinemia & Liver Collapse:</strong> Total bilirubin is <strong>6.8 mg/dL</strong> (&gt; 4.0 ceiling) with ALT 310 U/L and AST 285 U/L. Triggers <strong>Guardrail-2 Immediate Short-Circuit</strong>.
                </div>
              )}
              {selected.patient_id === "P043" && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3.5 text-xs text-rose-200 leading-relaxed space-y-1">
                  <strong className="text-rose-300">Severe Agranulocytosis:</strong> ANC is <strong>320.0 /uL</strong> (&lt; 500 ceiling) with platelets 28,000 /uL. Triggers <strong>Guardrail-2 Critical Hematologic Short-Circuit</strong>.
                </div>
              )}
              {selected.patient_id === "P036" && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 text-xs text-amber-200 leading-relaxed space-y-1">
                  <strong className="text-amber-300">Protocol Rule Violation:</strong> Prescribed dose is <strong>40 mg BID</strong> (exceeds 5 mg limit) and patient suffered acute hemorrhage <strong>12 days ago</strong> (violates 30-day washout).
                </div>
              )}
              {selected.patient_id === "P044" && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 text-xs text-amber-200 leading-relaxed space-y-1">
                  <strong className="text-amber-300">Massive Overdose Violation:</strong> Prescribed action is <strong>60 mg BID</strong> (12-fold higher than approved 5 mg BID ceiling). Triggers RAG rule rejection.
                </div>
              )}
              {selected.patient_id === "P045" && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 text-xs text-amber-200 leading-relaxed space-y-1">
                  <strong className="text-amber-300">Acute Bleeding Washout Violation:</strong> Patient had acute lower GI hemorrhage <strong>8 days ago</strong> (protocol mandates at least 30 days washout). Triggers RAG rule rejection.
                </div>
              )}
              {selected.patient_id === "P046" && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 text-xs text-amber-200 leading-relaxed space-y-1">
                  <strong className="text-amber-300">Renal Protocol Floor Violation:</strong> Observed CrCl is <strong>22.0 mL/min</strong> (&lt; 30 mL/min eligibility threshold, though eGFR 24 passes G2). Triggers RAG rule rejection.
                </div>
              )}
              {selected.patient_id === "P047" && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 text-xs text-amber-200 leading-relaxed space-y-1">
                  <strong className="text-amber-300">Active Autoimmune Exclusion:</strong> Active Crohn&apos;s disease on systemic corticosteroids strictly contraindicates checkpoint immunotherapy per trial protocol.
                </div>
              )}
              {selected.patient_id === "P037" && (
                <div className="rounded-xl border border-purple-500/40 bg-purple-950/30 p-3.5 text-xs text-purple-200 leading-relaxed space-y-1">
                  <strong className="text-purple-300">Unanimous 4-Agent Rejection:</strong> Unapproved biologic escalation (400 mg Q3W), active Grade 3 colitis + Ketoconazole DDI, and <strong>$48,500</strong> uncovered patient liability.
                </div>
              )}
              {selected.patient_id === "P048" && (
                <div className="rounded-xl border border-purple-500/40 bg-purple-950/30 p-3.5 text-xs text-purple-200 leading-relaxed space-y-1">
                  <strong className="text-purple-300">A2A Safety Agent Rejection:</strong> Severe pharmacokinetic drug-drug interaction. Concomitant Ketoconazole + Clarithromycin causes &gt;300% Apixaban AUC elevation and fatal hemorrhage hazard.
                </div>
              )}
              {selected.patient_id === "P049" && (
                <div className="rounded-xl border border-purple-500/40 bg-purple-950/30 p-3.5 text-xs text-purple-200 leading-relaxed space-y-1">
                  <strong className="text-purple-300">A2A Financial Agent Denial:</strong> Off-label exploratory sarcoma cohort is not covered by sponsor trial billing agreement. Incurs <strong>$52,800</strong> in non-covered patient liability.
                </div>
              )}
              {selected.patient_id === "P050" && (
                <div className="rounded-xl border border-purple-500/40 bg-purple-950/30 p-3.5 text-xs text-purple-200 leading-relaxed space-y-1">
                  <strong className="text-purple-300">Multi-Agent Dissent (Safety &amp; Financial):</strong> Quadruple antithrombotic therapy (Apixaban + Aspirin + Clopidogrel + Ticagrelor) causes severe hemorrhage risk and <strong>$6,400</strong> billing dispute.
                </div>
              )}
              {["P051", "P052", "P053", "P054"].includes(selected.patient_id) && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3.5 text-xs text-emerald-200 leading-relaxed space-y-1">
                  <strong className="text-emerald-300">✓ Fully Compliant Trial Candidate:</strong> All demographic attributes verified (G1), organ clearance corridors normal (G2), protocol dosing compliant (RAG), and all 4 specialist agents recommend approval with 100% sponsor trial coverage ($0 liability).
                </div>
              )}

              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 pt-1">
                <Detail label="Subject Name" value={selected.name} />
                <Detail label="Date of Birth" value={selected.dob} />
                <Detail
                  label="Age / Biological Sex"
                  value={
                    selected.patient_id === "P034"
                      ? "Unrecorded / Missing (21 CFR 312.62 Breach)"
                      : `${selected.age} yrs / ${selected.sex === "F" ? "Female" : selected.sex === "M" ? "Male" : selected.sex}`
                  }
                  emphasis={selected.patient_id === "P034"}
                />
                <Detail label="Stratification Cohort" value={selected.cohort} />
                <Detail label="Primary Pathology" value={selected.diagnosis} />
                <Detail
                  label="Renal Clearance (CrCl)"
                  value={selected.creatinine || "CrCl 55 mL/min"}
                  emphasis={Boolean(selected.creatinine?.includes("22") || selected.creatinine?.includes("< 30"))}
                />
                {selected.medications && selected.medications.length > 0 && (
                  <div className="col-span-2 md:col-span-3 pt-2 border-t border-[#262626]">
                    <dt className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      Active EMR Medications (Formulary Baseline)
                    </dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {selected.medications.map((m, idx) => (
                        <span
                          key={idx}
                          className="rounded-md border border-[#333] bg-[#1a1a1a] px-2.5 py-1 text-xs font-medium text-slate-200"
                        >
                          💊 {m}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Protocol select */}
          <div className="mt-5">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Protocol
            </label>
            <div className="relative">
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-[#2e2e2e] bg-[#121212] px-3 pr-9 text-sm text-white focus:border-[#3b82f6] focus:outline-none"
              >
                {PROTOCOLS.map((p) => (
                  <option key={p} value={p} className="bg-[#1e1e1e]">
                    {p}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          {/* Proposed action */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                Proposed Clinical Action
              </label>
              <span className="text-[11px] text-slate-500">
                Quick Test Scenarios:
              </span>
            </div>

            {/* Dynamic Scenario Preset Chips */}
            {(() => {
              const selectedMeds = selected?.medications || []
              const selectedCohort = selected?.cohort || ""
              const selectedDx = selected?.diagnosis || ""
              const selText = `${selectedCohort} ${selectedDx} ${selectedMeds.join(" ")}`.toLowerCase()

              let standardDose = "Apixaban 5 mg oral twice daily"
              let escalatedDose = "Apixaban 40 mg oral twice daily"
              let standardLabel = "✓ Standard 5 mg BID (Compliant)"
              let escalatedLabel = "⚠️ Escalated 40 mg BID (Dose Violation)"

              if (selText.includes("oncology") || selText.includes("pembrolizumab") || selText.includes("carcinoma") || selText.includes("cancer")) {
                standardDose = "Pembrolizumab 200 mg IV every 3 weeks"
                escalatedDose = "Pembrolizumab 400 mg IV every 3 weeks"
                standardLabel = "✓ Standard 200 mg Q3W (Compliant)"
                escalatedLabel = "⚠️ Escalated 400 mg Q3W (Dose Violation)"
              } else if (selText.includes("renal") || selText.includes("empagliflozin") || selText.includes("nephropathy")) {
                standardDose = "Empagliflozin 10 mg oral once daily"
                escalatedDose = "Empagliflozin 50 mg oral once daily"
                standardLabel = "✓ Standard 10 mg Daily (Compliant)"
                escalatedLabel = "⚠️ Escalated 50 mg Daily (Dose Violation)"
              } else if (selText.includes("nafld") || selText.includes("mash") || selText.includes("pioglitazone") || selText.includes("steatohepatitis")) {
                standardDose = "Pioglitazone 30 mg oral once daily"
                escalatedDose = "Pioglitazone 90 mg oral once daily"
                standardLabel = "✓ Standard 30 mg Daily (Compliant)"
                escalatedLabel = "⚠️ Escalated 90 mg Daily (Dose Violation)"
              }

              return (
                <div className="mb-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAction(standardDose)}
                    className="rounded border border-emerald-800/60 bg-emerald-950/30 px-2.5 py-1 text-xs text-emerald-400 hover:bg-emerald-900/50 transition-colors"
                  >
                    {standardLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction(escalatedDose)}
                    className="rounded border border-amber-800/60 bg-amber-950/30 px-2.5 py-1 text-xs text-amber-400 hover:bg-amber-900/50 transition-colors"
                  >
                    {escalatedLabel}
                  </button>
                  {selected?.medications && selected.medications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAction(`${selected.medications[0]} standard dosing per protocol schedule`)}
                      className="rounded border border-sky-800/60 bg-sky-950/30 px-2.5 py-1 text-xs text-sky-400 hover:bg-sky-900/50 transition-colors"
                    >
                      📋 Cohort Baseline ({selected.medications[0].split(" ")[0]})
                    </button>
                  )}

                  {/* Dedicated 1-click test scenario presets organized by failure & pass modes */}
                  <div className="w-full pt-2 flex flex-col gap-2 border-t border-[#252525] mt-1">
                    {/* G1 Category */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider min-w-28">G1 Ingress Fail:</span>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P034"); if (pat) choose(pat); }}
                        className={`rounded border px-2 py-0.5 text-[11px] font-mono transition-colors ${
                          disqualifiedIds.includes("P034")
                            ? "border-rose-600 bg-rose-950/80 text-rose-200"
                            : "border-rose-800/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60"
                        }`}
                      >
                        {disqualifiedIds.includes("P034") ? "P034: Locked Out" : "P034 (Age+Sex)"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P038"); if (pat) choose(pat); }}
                        className="rounded border border-rose-800/60 bg-rose-950/40 px-2 py-0.5 text-[11px] font-mono text-rose-300 hover:bg-rose-900/60 transition-colors"
                      >
                        P038 (Missing Sex)
                      </button>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P039"); if (pat) choose(pat); }}
                        className="rounded border border-rose-800/60 bg-rose-950/40 px-2 py-0.5 text-[11px] font-mono text-rose-300 hover:bg-rose-900/60 transition-colors"
                      >
                        P039 (Missing Age)
                      </button>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P040"); if (pat) choose(pat); }}
                        className="rounded border border-rose-800/60 bg-rose-950/40 px-2 py-0.5 text-[11px] font-mono text-rose-300 hover:bg-rose-900/60 transition-colors"
                      >
                        P040 (21 CFR 312.62)
                      </button>
                    </div>

                    {/* G2 Category */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider min-w-28">G2 Boundary:</span>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P035"); if (pat) choose(pat); }}
                        className="rounded border border-rose-800/60 bg-rose-950/40 px-2 py-0.5 text-[11px] font-mono text-rose-300 hover:bg-rose-900/60 transition-colors"
                      >
                        P035 (ALT 620 U/L)
                      </button>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P041"); if (pat) choose(pat); }}
                        className="rounded border border-rose-800/60 bg-rose-950/40 px-2 py-0.5 text-[11px] font-mono text-rose-300 hover:bg-rose-900/60 transition-colors"
                      >
                        P041 (eGFR 11 ESRD)
                      </button>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P042"); if (pat) choose(pat); }}
                        className="rounded border border-rose-800/60 bg-rose-950/40 px-2 py-0.5 text-[11px] font-mono text-rose-300 hover:bg-rose-900/60 transition-colors"
                      >
                        P042 (Bilirubin 6.8)
                      </button>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P043"); if (pat) choose(pat); }}
                        className="rounded border border-rose-800/60 bg-rose-950/40 px-2 py-0.5 text-[11px] font-mono text-rose-300 hover:bg-rose-900/60 transition-colors"
                      >
                        P043 (ANC 320 Agranulocytosis)
                      </button>
                    </div>

                    {/* RAG Rules Category */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider min-w-28">RAG Rules:</span>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P036"); if (pat) choose(pat); }}
                        className="rounded border border-amber-800/60 bg-amber-950/40 px-2 py-0.5 text-[11px] font-mono text-amber-300 hover:bg-amber-900/60 transition-colors"
                      >
                        P036 (Overdose 40mg + Bleed)
                      </button>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P044"); if (pat) choose(pat); }}
                        className="rounded border border-amber-800/60 bg-amber-950/40 px-2 py-0.5 text-[11px] font-mono text-amber-300 hover:bg-amber-900/60 transition-colors"
                      >
                        P044 (Overdose 60mg BID)
                      </button>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P045"); if (pat) choose(pat); }}
                        className="rounded border border-amber-800/60 bg-amber-950/40 px-2 py-0.5 text-[11px] font-mono text-amber-300 hover:bg-amber-900/60 transition-colors"
                      >
                        P045 (Washout 8d &lt; 30d)
                      </button>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P046"); if (pat) choose(pat); }}
                        className="rounded border border-amber-800/60 bg-amber-950/40 px-2 py-0.5 text-[11px] font-mono text-amber-300 hover:bg-amber-900/60 transition-colors"
                      >
                        P046 (CrCl 22 &lt; 30 Floor)
                      </button>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P047"); if (pat) choose(pat); }}
                        className="rounded border border-amber-800/60 bg-amber-950/40 px-2 py-0.5 text-[11px] font-mono text-amber-300 hover:bg-amber-900/60 transition-colors"
                      >
                        P047 (Autoimmune Exclusion)
                      </button>
                    </div>

                    {/* A2A Discrepancies Category */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider min-w-28">4 A2A Rejection:</span>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P037"); if (pat) choose(pat); }}
                        className="rounded border border-purple-800/60 bg-purple-950/40 px-2 py-0.5 text-[11px] font-mono text-purple-300 hover:bg-purple-900/60 transition-colors"
                      >
                        P037 (4-Agent Dissent)
                      </button>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P048"); if (pat) choose(pat); }}
                        className="rounded border border-purple-800/60 bg-purple-950/40 px-2 py-0.5 text-[11px] font-mono text-purple-300 hover:bg-purple-900/60 transition-colors"
                      >
                        P048 (DDI Safety Rejection)
                      </button>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P049"); if (pat) choose(pat); }}
                        className="rounded border border-purple-800/60 bg-purple-950/40 px-2 py-0.5 text-[11px] font-mono text-purple-300 hover:bg-purple-900/60 transition-colors"
                      >
                        P049 (Financial $52.8k Denial)
                      </button>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P050"); if (pat) choose(pat); }}
                        className="rounded border border-purple-800/60 bg-purple-950/40 px-2 py-0.5 text-[11px] font-mono text-purple-300 hover:bg-purple-900/60 transition-colors"
                      >
                        P050 (Triple Antiplatelet Dissent)
                      </button>
                    </div>

                    {/* Clean Passes Category */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider min-w-28">Clean Passes:</span>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P051"); if (pat) choose(pat); }}
                        className="rounded border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 text-[11px] font-mono text-emerald-300 hover:bg-emerald-900/60 transition-colors"
                      >
                        ✓ P051 (Atrial Fib Pass)
                      </button>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P052"); if (pat) choose(pat); }}
                        className="rounded border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 text-[11px] font-mono text-emerald-300 hover:bg-emerald-900/60 transition-colors"
                      >
                        ✓ P052 (Oncology Pass)
                      </button>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P053"); if (pat) choose(pat); }}
                        className="rounded border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 text-[11px] font-mono text-emerald-300 hover:bg-emerald-900/60 transition-colors"
                      >
                        ✓ P053 (MASH Pass)
                      </button>
                      <button
                        type="button"
                        onClick={() => { const pat = patients.find(p => p.patient_id === "P054"); if (pat) choose(pat); }}
                        className="rounded border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 text-[11px] font-mono text-emerald-300 hover:bg-emerald-900/60 transition-colors"
                      >
                        ✓ P054 (Renal SGLT2i Pass)
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}

            <textarea
              value={action}
              onChange={(e) => setAction(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-[#2e2e2e] bg-[#121212] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#3b82f6] focus:outline-none font-mono"
            />

            {isDisqualified && (
              <div className="mt-4 rounded-xl border border-rose-500/60 bg-gradient-to-r from-rose-950/60 via-[#1a0c0e] to-[#121212] p-4 space-y-2 text-xs text-rose-200 shadow-lg shadow-rose-950/40">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wide text-rose-300">
                  <Lock className="size-4 text-rose-400" />
                  ⛔ Patient ID Permanently Excluded (3/3 Retries Exhausted)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Patient <strong className="font-mono text-white underline">{selected?.patient_id}</strong> is disqualified from clinical trial intake under <strong>FDA 21 CFR 312.62 & ICH E6(R2)</strong>. The 3-iteration demographic resupply budget has been exhausted without verified demographic resolution. This enrollment portal is barred from accepting or submitting this patient ID.
                </p>
                <div className="rounded border border-rose-800/40 bg-[#0d0507] p-2 text-[11px] font-mono text-rose-400">
                  Terminal Gate Status: EXCLUDED_MAX_ITERS · 21 CFR 312.62 Ingress Lockout
                </div>
              </div>
            )}
          </div>

          <Button
            disabled={!selected || isDisqualified}
            onClick={() =>
              selected && !isDisqualified && onSubmit(selected, protocol, action)
            }
            className={`mt-6 h-11 w-full font-semibold transition-all ${
              isDisqualified
                ? "bg-rose-950/80 border border-rose-700/60 text-rose-300 cursor-not-allowed shadow-inner"
                : "bg-[#3b82f6] text-white hover:bg-[#3b82f6]/90 disabled:opacity-40"
            }`}
          >
            {isDisqualified ? (
              <>
                <Lock className="size-4 mr-2 text-rose-400" />
                Cannot Submit: Patient ID Permanently Excluded (3/3)
              </>
            ) : (
              <>
                <Send className="size-4 mr-2" />
                Submit for AI Review
              </>
            )}
          </Button>
          {!selected && (
            <p className="mt-2 text-center text-xs text-slate-500">
              Select a patient to enable submission.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

function Detail({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-sm ${
          emphasis ? "font-semibold text-[#f59e0b]" : "text-white"
        }`}
      >
        {value}
      </dd>
    </div>
  )
}