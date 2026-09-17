"use client"

import {useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  Check,
  ChevronDown,
  Search,
  Send,
  User,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PROTOCOLS } from "@/lib/clinical-data"
import { getPatientsFromSupabase } from "@/app/actions"

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
}

export function IntakeView({ onSubmit }: IntakeViewProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Patient | null>(null)
  const [protocol, setProtocol] = useState(PROTOCOLS[0])
  const [action, setAction] = useState("Apixaban 5 mg oral twice daily")
  const containerRef = useRef<HTMLDivElement>(null)

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
              age: Number(item.age) || 65,
              sex: String(item.sex || "M"),
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

    const meds = patient.medications || []
    const cohort = patient.cohort || ""
    const diagnosis = patient.diagnosis || ""
    const allText = `${cohort} ${diagnosis} ${meds.join(" ")}`.toLowerCase()

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
      <header className="flex items-center justify-between border-b border-[#2e2e2e] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md border border-[#2e2e2e] bg-[#1e1e1e]">
            <Activity className="size-4 text-[#3b82f6]" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">
              Clinical Adjudication System
            </p>
            <p className="text-xs text-slate-400">Intake Portal</p>
          </div>
        </div>
        <span className="rounded-full border border-[#2e2e2e] bg-[#1e1e1e] px-3 py-1 text-xs font-medium text-slate-300">
          Site 04 — Massachusetts General
        </span>
      </header>

      <main className="px-4 pb-16">
        <div className="mx-auto mt-12 max-w-2xl rounded-xl border border-[#2e2e2e] bg-[#1e1e1e] p-6">
          <h1 className="text-lg font-semibold text-balance">
            Initiate Patient Adjudication Session
          </h1>
          <p className="mt-1 text-sm text-slate-400 text-pretty">
            Look up a trial participant and submit a proposed clinical action for
            multi-agent AI review before human adjudication.
          </p>

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
                  {results.map((p) => (
                    <li key={p.patient_id}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          choose(p)
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[#2a2a2a]"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex size-8 items-center justify-center rounded-md bg-[#121212] text-slate-400">
                            <User className="size-4" />
                          </span>
                          <span>
                            <span className="block text-sm font-medium text-white">
                              {p.name}
                            </span>
                            <span className="block font-mono text-xs text-slate-500">
                              {p.patient_id}
                            </span>
                          </span>
                        </span>
                        <span className="rounded-full border border-[#2e2e2e] bg-[#121212] px-2 py-0.5 text-[11px] text-slate-300">
                          {p.cohort ? p.cohort.split(" - ")[0] : "Unassigned"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Selected patient details */}
          {selected && (
            <div className="mt-5 rounded-lg border border-[#2e2e2e] bg-[#121212] p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#10b981]">
                <Check className="size-3.5" />
                Patient Selected
              </p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
                <Detail label="Full Name" value={selected.name} />
                <Detail label="DOB" value={selected.dob} />
                <Detail
                  label="Age / Sex"
                  value={`${selected.age} / ${selected.sex}`}
                />
                <Detail label="Cohort" value={selected.cohort} />
                <Detail label="Primary Diagnosis" value={selected.diagnosis} />
                <Detail
                  label="Renal Function (CrCl)"
                  value={selected.creatinine || "CrCl 55 mL/min"}
                  emphasis={Boolean(selected.creatinine?.includes("22") || selected.creatinine?.includes("< 30"))}
                />
                {selected.medications && selected.medications.length > 0 && (
                  <div className="col-span-2 md:col-span-3">
                    <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                      Active Baseline Medications
                    </dt>
                    <dd className="mt-0.5 text-xs text-slate-300">
                      {selected.medications.join(" · ")}
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
                </div>
              )
            })()}

            <textarea
              value={action}
              onChange={(e) => setAction(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-[#2e2e2e] bg-[#121212] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#3b82f6] focus:outline-none font-mono"
            />
          </div>

          <Button
            disabled={!selected}
            onClick={() =>
              selected && onSubmit(selected, protocol, action)
            }
            className="mt-6 h-11 w-full bg-[#3b82f6] text-white hover:bg-[#3b82f6]/90 disabled:opacity-40"
          >
            <Send className="size-4" />
            Submit for AI Review
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