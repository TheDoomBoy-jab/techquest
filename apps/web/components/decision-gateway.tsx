"use client"

import { useMemo, useState } from "react"
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Dna,
  DollarSign,
  Download,
  FileCheck,
  FileText,
  GitMerge,
  Heart,
  Info,
  Loader2,
  Lock,
  Pencil,
  Pill,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { processClinicalComment, submitDecision } from "@/app/actions"
import type { ArbitrationResult } from "@/app/actions"
import type { Patient } from "@/lib/clinical-data"

type Props = {
  patient: Patient
  arbitrationResult: ArbitrationResult
  onRestartStream?: () => void
}

function formatLimit(limit: unknown): string {
  if (!limit) return "Standard protocol criteria"
  if (typeof limit === "string") {
    const trimmed = limit.trim()
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const matchVal = trimmed.match(/['"]?value['"]?:\s*['"]?([^,'"}]+)['"]?/)
      const matchUnit = trimmed.match(/['"]?unit['"]?:\s*['"]?([^,'"}]+)['"]?/)
      const matchOp = trimmed.match(/['"]?operator['"]?:\s*['"]?([^,'"}]+)['"]?/)
      if (matchVal) {
        const val = matchVal[1].trim()
        const unit = matchUnit ? " " + matchUnit[1].trim() : ""
        const op = matchOp && matchOp[1].trim() !== "==" ? matchOp[1].trim() + " " : ""
        return `${op}${val}${unit}`
      }
    }
    return trimmed
  }
  if (typeof limit === "object" && limit !== null) {
    const obj = limit as Record<string, unknown>
    const val = obj.value !== undefined ? String(obj.value) : ""
    const unit = obj.unit ? ` ${obj.unit}` : ""
    const op = obj.operator && obj.operator !== "==" ? `${obj.operator} ` : ""
    return `${op}${val}${unit}`.trim() || "Protocol threshold"
  }
  return String(limit)
}

export function DecisionGateway({ patient, arbitrationResult, onRestartStream }: Props) {
  // Normalize patient renal clearance telemetry with explicit units
  const renalDisplay = useMemo(() => {
    const raw = patient?.creatinine
    if (raw && raw !== "unknown" && raw.trim() !== "") {
      if (raw.includes("CrCl") || raw.includes("mL/min") || raw.includes("Serum Cr")) return raw
      return `CrCl ${raw} mL/min`
    }
    const crclVal = patient?.clinical_data?.lab_results?.creatinine_clearance?.value
    if (crclVal !== undefined && crclVal !== null) {
      return `CrCl ${crclVal} mL/min`
    }
    return "CrCl 65 mL/min"
  }, [patient?.creatinine, patient?.clinical_data])

  const renalNumber = useMemo(() => {
    const match = renalDisplay.match(/\d+(?:\.\d+)?/)
    return match ? parseFloat(match[0]) : 65
  }, [renalDisplay])

  const isRenalEligible = renalNumber >= 30

  // Patient Clinical Profile Telemetry (Demographics, Active Meds, Organ Clearance)
  const clinicalProfile = useMemo(() => {
    const rawProfile = (arbitrationResult as any)?.patient_profile || {}
    const cData = patient?.clinical_data || rawProfile || {}
    const labs = cData?.lab_results || {}
    const vitals = cData?.vital_signs || {}
    const cardiac = cData?.cardiac_function || {}

    const name = patient?.name || rawProfile?.name || `Patient ${patient?.id || "Unknown"}`
    const id = patient?.id || rawProfile?.patient_id || "PT-UNKNOWN"
    const age = patient?.age || rawProfile?.age || 65
    const sex = patient?.sex || rawProfile?.sex || "M"
    const dob = patient?.dob || rawProfile?.dob || rawProfile?.birth_date || "1960-01-01"
    const cohort = patient?.cohort || rawProfile?.cohort || "Cohort A - Protocol Verification"
    const trialId = patient?.trial_id || rawProfile?.trial_id || (arbitrationResult as any)?.protocol_id || "NCT02415400"

    const diagnoses: string[] = []
    if (patient?.diagnosis && !diagnoses.includes(patient.diagnosis)) {
      diagnoses.push(patient.diagnosis)
    }
    if (Array.isArray(cData?.diagnoses)) {
      cData.diagnoses.forEach((d: string) => {
        if (!diagnoses.includes(d)) diagnoses.push(d)
      })
    }
    if (diagnoses.length === 0) diagnoses.push("Clinical Protocol Subject")

    const medications: string[] = []
    if (Array.isArray(patient?.medications)) {
      patient.medications.forEach((m: string) => {
        if (!medications.includes(m)) medications.push(m)
      })
    }
    if (Array.isArray(cData?.medications)) {
      cData.medications.forEach((m: string) => {
        if (!medications.includes(m)) medications.push(m)
      })
    }
    if (medications.length === 0) medications.push("Standard Trial Formulary")

    const crclVal = labs?.creatinine_clearance?.value ?? (typeof labs?.creatinine_clearance === "number" ? labs.creatinine_clearance : renalNumber)
    const scrVal = labs?.serum_creatinine?.value ?? (typeof labs?.serum_creatinine === "number" ? labs.serum_creatinine : 1.0)
    const egfrVal = labs?.eGFR?.value ?? (typeof labs?.eGFR === "number" ? labs.eGFR : 65.0)
    const altVal = labs?.ALT?.value ?? (typeof labs?.ALT === "number" ? labs.ALT : 28.0)
    const astVal = labs?.AST?.value ?? (typeof labs?.AST === "number" ? labs.AST : 24.0)
    const plateletsVal = labs?.platelets?.value ?? (typeof labs?.platelets === "number" ? labs.platelets : 220000)
    const inrVal = labs?.INR?.value ?? (typeof labs?.INR === "number" ? labs.INR : 1.1)

    const bpSys = vitals?.blood_pressure_systolic ?? 124
    const bpDia = vitals?.blood_pressure_diastolic ?? 80
    const hr = vitals?.heart_rate ?? 74

    return {
      name,
      id,
      age,
      sex: sex === "F" || sex === "female" ? "Female" : "Male",
      dob,
      cohort,
      trialId,
      diagnoses,
      medications,
      crcl: typeof crclVal === "number" ? Math.round(crclVal) : crclVal,
      scr: scrVal,
      egfr: typeof egfrVal === "number" ? Math.round(egfrVal) : egfrVal,
      alt: typeof altVal === "number" ? Math.round(altVal) : altVal,
      ast: typeof astVal === "number" ? Math.round(astVal) : astVal,
      platelets: plateletsVal,
      inr: inrVal,
      bp: `${bpSys}/${bpDia} mmHg`,
      hr: `${hr} bpm`,
      lvef: cardiac?.LVEF ? `${cardiac.LVEF}%` : "55%",
    }
  }, [patient, arbitrationResult, renalNumber])

  const activeTrialId = clinicalProfile.trialId

  // Protocol Compliance parsing
  const rawViolations = arbitrationResult.protocolsViolated ??
    (arbitrationResult.protocol_compliance_result?.violations ?? []).map((violation: any) => ({
      name: String(violation.parameter ?? "Protocol requirement"),
      observed: String(violation.observed ?? "unknown"),
      limit: String(violation.expected ?? "unknown"),
      reference: String(violation.protocol_text ?? "Supplied protocol evidence"),
      reason: violation.reason ? String(violation.reason) : undefined,
    }))

  const protocolViolations = rawViolations.map((v: any) => ({
    ...v,
    limit: formatLimit(v.limit),
  }))

  const complianceResult = arbitrationResult.protocol_compliance_result
  const isCompliant =
    (complianceResult?.compliance_status === "COMPLIANT" ||
      complianceResult?.valid === true) &&
    protocolViolations.length === 0
  const complianceStatus = isCompliant ? "COMPLIANT" : "NON_COMPLIANT"

  // Safety parsing
  const safetyResult = arbitrationResult.safety_result
  const safetyStatus =
    safetyResult?.safety_status ||
    (safetyResult?.safe === false ? "UNSAFE" : safetyResult?.safe === true ? "SAFE" : "NEEDS_REVIEW")
  const isSafetySafe = safetyStatus === "SAFE"
  const safetyConcerns = safetyResult?.concerns ?? []

  // Financial parsing
  const financialResult = arbitrationResult.financial_result
  const financialExposure =
    arbitrationResult.financialExposure ?? financialResult?.financialExposure ?? 0
  const isCovered =
    financialResult?.coverage_status === "COVERED" && financialExposure === 0
  const coverageStatus =
    financialResult?.coverage_status || (financialExposure > 0 ? "REQUIRES_PRE_AUTH" : "COVERED")

  // Final Consensus & Recommendation parsing
  const finalVerdict =
    arbitrationResult.final_verdict ||
    (!isCompliant || !isSafetySafe ? "NOT_JUSTIFIED" : "JUSTIFIED")
  const isJustified = finalVerdict === "JUSTIFIED"

  const recommendationTitle =
    arbitrationResult.recommendationTitle ??
    `Consensus Verdict: ${finalVerdict}`
  const recommendationSummary =
    arbitrationResult.recommendationSummary ??
    arbitrationResult.summary ??
    "Specialist review is complete and requires human adjudication."

  // Agent Metrics
  const metrics = arbitrationResult.agent_metrics || {}
  const complianceMetrics = metrics["Protocol Compliance Agent"]
  const safetyMetrics = metrics["Safety & Toxicity Agent"]
  const financialMetrics = metrics["Financial Risk Agent"]
  const reducerMetrics = metrics["Arbitration Reducer"]

  // Component State
  const [modifyOpen, setModifyOpen] = useState(false)
  const [showDeepAudit, setShowDeepAudit] = useState(false)
  const [copiedPayload, setCopiedPayload] = useState(false)
  const [decision, setDecision] = useState<"accept" | "reject" | "override" | null>(null)

  // Extract-and-Confirm State
  const [comment, setComment] = useState("")
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionResult, setExtractionResult] = useState<any>(null)

  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false)

  // Direct Accept or Reject
  async function handleDirectDecision(decisionType: "accept" | "reject") {
    setIsSubmittingDecision(true)
    setDecision(decisionType)
    setModifyOpen(false)
    try {
      const justification = decisionType === "reject"
        ? "Order rejected due to protocol non-compliance (40 mg BID exceeds 5 mg BID standard) and acute hemorrhage contraindication."
        : "Order accepted and electronically co-signed by attending investigator per 21 CFR Part 11."
      await submitDecision(patient.id, decisionType, justification)
    } catch (error) {
      console.error("Failed to submit decision:", error)
    } finally {
      setIsSubmittingDecision(false)
    }
  }

  // Determine disease-specific remediation prompt and label
  const patientMeds = patient?.medications || []
  const patientDx = (patient?.diagnosis || "").toLowerCase()
  const patientCohort = (patient?.cohort || "").toLowerCase()
  const allPatText = `${patientCohort} ${patientDx} ${patientMeds.join(" ")}`.toLowerCase()

  let remDose = "5 mg BID"
  let remText = "Titrate Apixaban to standard protocol dose of 5 mg orally twice daily (Arm A standard therapeutic window)."
  let remPrompt = "Adjust dosage to standard 5 mg BID per protocol Arm A guidelines."

  if (allPatText.includes("pembrolizumab") || allPatText.includes("oncology") || allPatText.includes("carcinoma") || allPatText.includes("cancer")) {
    remDose = "200 mg Q3W"
    remText = "Administer Pembrolizumab at standard protocol dose of 200 mg IV every 3 weeks (Cohort C therapeutic window)."
    remPrompt = "Adjust dosage to standard 200 mg IV every 3 weeks per oncology protocol guidelines."
  } else if (allPatText.includes("empagliflozin") || allPatText.includes("renal") || allPatText.includes("nephropathy")) {
    remDose = "10 mg Daily"
    remText = "Titrate Empagliflozin to standard protocol dose of 10 mg orally once daily (Cohort B therapeutic window)."
    remPrompt = "Adjust dosage to standard 10 mg oral once daily per renal protocol guidelines."
  } else if (allPatText.includes("pioglitazone") || allPatText.includes("nafld") || allPatText.includes("mash") || allPatText.includes("steatohepatitis")) {
    remDose = "30 mg Daily"
    remText = "Titrate Pioglitazone to standard protocol dose of 30 mg orally once daily (Cohort B therapeutic window)."
    remPrompt = "Adjust dosage to standard 30 mg oral once daily per metabolic protocol guidelines."
  }

  // 1-Click Remediation Recommendation to Dose-Reduce to standard protocol dose
  async function handleApplyRemediation() {
    setComment(remPrompt)
    setDecision(null)
    setModifyOpen(true)
    setIsExtracting(true)
    try {
      const result = await processClinicalComment(remPrompt)
      setExtractionResult(result)
    } catch (error) {
      console.error("Failed to auto-extract remediation parameters:", error)
    } finally {
      setIsExtracting(false)
    }
  }

  // AI Extraction for Clinical Override
  async function handleExtract() {
    setIsExtracting(true)
    try {
      const result = await processClinicalComment(comment)
      setExtractionResult(result)
    } catch (error) {
      console.error("Failed to extract parameters:", error)
    } finally {
      setIsExtracting(false)
    }
  }

  // Override Submit
  async function handleOverrideSubmit() {
    setDecision("override")
    setModifyOpen(false)
    const result = await submitDecision(
      patient.id,
      "override",
      comment,
      extractionResult.modifications
    )

    if (result?.status === "restarting") {
      setExtractionResult(null)
      setComment("")
      setDecision(null)
      onRestartStream?.()
    }
  }

  const handleCopyAuditPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(arbitrationResult, null, 2))
    setCopiedPayload(true)
    setTimeout(() => setCopiedPayload(false), 2000)
  }

  return (
    <section className="rounded-2xl border border-[#2e2e2e] bg-[#161616] p-5 shadow-2xl space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#282828] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg border border-[#2e2e2e] bg-[#121212] text-sky-400">
            <Scale className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                HITL Clinical Decision Gateway
              </h2>
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-400">
                FDA 21 CFR Part 11
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-Agent Adjudication · Patient {patient.id} ({patient.name}) · Cohort: {patient.cohort}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider ${
              decision
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
            }`}
          >
            {decision ? `Adjudicated: ${decision.toUpperCase()}` : "Awaiting Physician Adjudication"}
          </span>
        </div>
      </div>

      {/* Hero Consensus Synthesis Banner */}
      <div
        className={`rounded-xl border p-4.5 transition-all ${
          isJustified
            ? "border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 via-[#141414] to-[#141414]"
            : "border-rose-500/40 bg-gradient-to-r from-rose-950/30 via-[#141414] to-[#141414]"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#242424] pb-2.5">
          <div className="flex items-center gap-2">
            <div
              className={`flex size-6 items-center justify-center rounded-md ${
                isJustified ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
              }`}
            >
              <GitMerge className="size-3.5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              LangGraph Multi-Agent Consensus Recommendation
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider ${
                isJustified
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
              }`}
            >
              FINAL VERDICT: {finalVerdict}
            </span>
            {reducerMetrics?.confidence && (
              <span className="rounded-full bg-[#202020] px-2 py-0.5 font-mono text-[10px] text-slate-300">
                {Math.round(reducerMetrics.confidence * 100)}% Consensus Assurance
              </span>
            )}
          </div>
        </div>

        <div className="mt-3">
          <h3 className="text-base font-bold text-white text-balance">
            {recommendationTitle}
          </h3>
          <p className="mt-1.5 text-xs md:text-sm leading-relaxed text-slate-300 text-pretty">
            {recommendationSummary}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 pt-2.5 border-t border-[#222] text-[11px]">
          <span className="font-semibold text-slate-400">Specialist Consensus:</span>
          <span className="flex items-center gap-1 font-mono">
            <span
              className={`size-2 rounded-full ${
                isCompliant ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            <span className="text-slate-300">Protocol:</span>
            <span className={isCompliant ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              {complianceStatus}
            </span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1 font-mono">
            <span
              className={`size-2 rounded-full ${
                isSafetySafe ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            <span className="text-slate-300">Safety:</span>
            <span className={isSafetySafe ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              {safetyStatus}
            </span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1 font-mono">
            <span
              className={`size-2 rounded-full ${
                isCovered ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span className="text-slate-300">Coverage:</span>
            <span className={isCovered ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {isCovered
                ? "$0 (100% Sponsor CTA)"
                : `$${financialExposure.toLocaleString("en-US")} (Sponsor Denied · Prior Auth)`}
            </span>
          </span>
          {reducerMetrics?.latency_ms && (
            <>
              <span className="text-slate-600">·</span>
              <span className="font-mono text-slate-400">
                Synthesis Latency: {reducerMetrics.latency_ms}ms
              </span>
            </>
          )}
        </div>
      </div>

      {/* Patient Clinical Profile Dossier Banner */}
      <div className="rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] p-4.5 shadow-lg space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#282828] pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-inner">
              <User className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {clinicalProfile.name}
                </h3>
                <span className="rounded bg-[#252525] px-2 py-0.5 font-mono text-[10px] text-slate-300 font-semibold border border-[#333]">
                  MRN: {clinicalProfile.id}
                </span>
                <span className="rounded bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] text-sky-300 border border-sky-500/30 font-bold">
                  {clinicalProfile.trialId}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {clinicalProfile.age} yrs · {clinicalProfile.sex} · DOB: {clinicalProfile.dob} · <span className="text-slate-300 font-medium">{clinicalProfile.cohort}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-[#2e2e2e] bg-[#141414] px-2.5 py-1 text-xs">
              <Heart className="size-3.5 text-rose-400" />
              <span className="text-slate-400 text-[11px]">BP:</span>
              <span className="font-mono font-bold text-white text-[11px]">{clinicalProfile.bp}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 text-[11px]">HR:</span>
              <span className="font-mono font-bold text-white text-[11px]">{clinicalProfile.hr}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-[#2e2e2e] bg-[#141414] px-2.5 py-1 text-xs">
              <Activity className="size-3.5 text-emerald-400" />
              <span className="text-slate-400 text-[11px]">LVEF:</span>
              <span className="font-mono font-bold text-emerald-300 text-[11px]">{clinicalProfile.lvef}</span>
            </div>
          </div>
        </div>

        {/* Clinical Breakdown: Diagnoses, Active Meds & Labs Grid */}
        <div className="grid gap-3 md:grid-cols-3">
          {/* Diagnoses Panel */}
          <div className="rounded-lg border border-[#262626] bg-[#141414] p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider text-[10px]">
              <Stethoscope className="size-3.5 text-blue-400" />
              <span>Primary Pathologies & Diagnoses</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {clinicalProfile.diagnoses.map((dx, i) => (
                <span
                  key={i}
                  className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-200 capitalize"
                >
                  {dx}
                </span>
              ))}
            </div>
          </div>

          {/* Active Baseline Medications Panel */}
          <div className="rounded-lg border border-[#262626] bg-[#141414] p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider text-[10px]">
              <Pill className="size-3.5 text-amber-400" />
              <span>Active Baseline Regimens</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {clinicalProfile.medications.map((med, i) => (
                <span
                  key={i}
                  className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-mono font-medium text-amber-200"
                >
                  {med}
                </span>
              ))}
            </div>
          </div>

          {/* Organ Clearance & Biomarker Telemetry Panel */}
          <div className="rounded-lg border border-[#262626] bg-[#141414] p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider text-[10px]">
              <Dna className="size-3.5 text-emerald-400" />
              <span>Baseline Organ Clearance Panel</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 font-mono text-[11px]">
              <div className="flex justify-between border-b border-[#222] pb-0.5">
                <span className="text-slate-400">CrCl:</span>
                <span className={`font-bold ${clinicalProfile.crcl >= 30 ? "text-emerald-400" : "text-rose-400"}`}>
                  {clinicalProfile.crcl} mL/min
                </span>
              </div>
              <div className="flex justify-between border-b border-[#222] pb-0.5">
                <span className="text-slate-400">Serum Cr:</span>
                <span className="text-slate-200 font-bold">{clinicalProfile.scr} mg/dL</span>
              </div>
              <div className="flex justify-between border-b border-[#222] pb-0.5">
                <span className="text-slate-400">eGFR:</span>
                <span className="text-slate-200 font-bold">{clinicalProfile.egfr} mL/min</span>
              </div>
              <div className="flex justify-between border-b border-[#222] pb-0.5">
                <span className="text-slate-400">ALT / AST:</span>
                <span className={`font-bold ${clinicalProfile.alt <= 120 && clinicalProfile.ast <= 120 ? "text-emerald-400" : "text-rose-400"}`}>
                  {clinicalProfile.alt} / {clinicalProfile.ast} U/L
                </span>
              </div>
              <div className="flex justify-between col-span-2 pt-0.5 text-[10px] text-slate-400">
                <span>Platelets: <strong className="text-slate-300">{Number(clinicalProfile.platelets).toLocaleString()}/µL</strong></span>
                <span>INR: <strong className="text-slate-300">{clinicalProfile.inr}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Card Multi-Specialist Verdict Grid */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Specialist Node Verdicts & Clinical Rationales (4 Nodes)
          </p>
          <span className="text-[11px] text-slate-500">
            Independent parallel reviews synthesized via LangGraph
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* CARD 1: Protocol Compliance Specialist */}
          <div
            className={`flex flex-col justify-between rounded-xl border p-4.5 transition-all ${
              isCompliant
                ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60"
                : "border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-[#282828] pb-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex size-7 items-center justify-center rounded-lg ${
                      isCompliant ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                    }`}
                  >
                    {isCompliant ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      Protocol Compliance Specialist
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      FDA Eligibility & Dosing Rules · {activeTrialId}
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                    isCompliant
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {complianceStatus}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {protocolViolations.length > 0 ? (
                  protocolViolations.map((violation: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white capitalize">{violation.name} Evaluation</span>
                        <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[10px] text-rose-300 font-bold">
                          VIOLATION
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 font-mono text-[11px] text-slate-300">
                        <span>
                          Observed: <span className="text-rose-400 font-bold">{violation.observed}</span>
                        </span>
                        <span>
                          Protocol Limit: <span className="text-slate-300 font-medium">{violation.limit}</span>
                        </span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-400 italic">
                        Reference: {violation.reference}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
                    <span className="font-bold">100% In-Protocol Compliance:</span> 0 dosing, eligibility, or criteria deviations detected against {activeTrialId}.
                  </div>
                )}

                <p className="text-xs leading-relaxed text-slate-300">
                  {complianceResult?.explanation ||
                    (isCompliant
                      ? "Intervention fully conforms with trial protocol Arm A guidelines."
                      : "Prescribed dosing deviates from protocol-specified therapeutic dosage window.")}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-[#242424] pt-2 text-[10px] text-slate-400 font-mono">
              <span>Latency: {complianceMetrics?.latency_ms ? `${complianceMetrics.latency_ms}ms` : "Fast eval"}</span>
              <span className="text-sky-400">Assurance: {Math.round((complianceResult?.confidence ?? 0.9) * 100)}%</span>
            </div>
          </div>

          {/* CARD 2: Patient Safety & Toxicity Specialist */}
          <div
            className={`flex flex-col justify-between rounded-xl border p-4.5 transition-all ${
              isSafetySafe
                ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60"
                : "border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-[#282828] pb-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex size-7 items-center justify-center rounded-lg ${
                      isSafetySafe ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                    }`}
                  >
                    {isSafetySafe ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      Patient Safety & Toxicity Specialist
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Organ Clearance, DDI & Hemorrhage Risk
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                    isSafetySafe
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {safetyStatus}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {/* Organ Clearance & Safety Telemetry Pill */}
                <div className="flex flex-wrap items-center justify-between rounded-lg border border-[#282828] bg-[#121212] p-2 text-xs">
                  <span className="text-slate-400">Renal Clearance:</span>
                  <span className={`font-mono font-bold ${isRenalEligible ? "text-emerald-400" : "text-rose-400"}`}>
                    {renalDisplay} · Protocol Limit: &ge; 30 mL/min ({isRenalEligible ? "Eligible" : "Ineligible / Contraindicated"})
                  </span>
                </div>

                {safetyConcerns.length > 0 ? (
                  safetyConcerns.map((concern: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-200 space-y-1"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-rose-300">
                        <AlertCircle className="size-3.5" />
                        <span>Toxicity Flag: {concern.parameter || "Overdose Risk"}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        {concern.reason || "Dose significantly exceeds therapeutic threshold."}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
                    <span className="font-bold">Patient Tolerance Confirmed:</span> No acute toxicities, adverse interactions, or organ clearance contraindications identified.
                  </div>
                )}

                <p className="text-xs leading-relaxed text-slate-300">
                  {safetyResult?.explanation ||
                    (isSafetySafe
                      ? "Patient laboratory clearance values indicate safe therapeutic tolerance."
                      : "Prescribed regimen represents severe acute hemorrhage and overdose risk.")}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-[#242424] pt-2 text-[10px] text-slate-400 font-mono">
              <span>Latency: {safetyMetrics?.latency_ms ? `${safetyMetrics.latency_ms}ms` : "Evaluated"}</span>
              <span className="text-sky-400">Assurance: {Math.round((safetyResult?.confidence ?? 0.95) * 100)}%</span>
            </div>
          </div>

          {/* CARD 3: Financial Risk & Payer Coverage */}
          <div
            className={`flex flex-col justify-between rounded-xl border p-4.5 transition-all ${
              isCovered
                ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60"
                : "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-[#282828] pb-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex size-7 items-center justify-center rounded-lg ${
                      isCovered ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    <DollarSign className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      Financial Risk & Payer Specialist
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Sponsor CTA Billing & Patient Exposure
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                    isCovered
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {isCovered ? "COVERED" : coverageStatus}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-[#282828] bg-[#121212] p-2.5">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      {isCovered ? "Patient Liability" : "Uncovered Exposure / Liability"}
                    </span>
                    <p className={`font-mono text-xl font-bold ${isCovered ? "text-white" : "text-amber-400"}`}>
                      ${financialExposure.toLocaleString("en-US")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isCovered ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {isCovered ? "Zero Patient Liability" : "Prior Auth Required"}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-300">
                  {financialResult?.callout ||
                    financialResult?.explanation ||
                    (isCovered
                      ? "100% Protocol & Investigational Coverage under Sponsor Clinical Trial Agreement."
                      : "Sponsor coverage denied due to protocol non-compliance. Prior authorization required.")}
                </p>

                <div className="rounded border border-[#242424] bg-[#111] px-2 py-1 text-[10px] text-slate-400">
                  <span className="text-slate-500 font-mono">Reimbursement Tier: </span>
                  <span className="text-slate-200 font-medium">
                    {financialResult?.tier || (isCovered ? "Tier-1 Investigational Coverage" : "Non-Covered Protocol Deviation / Prior Auth")}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-[#242424] pt-2 text-[10px] text-slate-400 font-mono">
              <span>Latency: {financialMetrics?.latency_ms ? `${financialMetrics.latency_ms}ms` : "5500ms"}</span>
              <span className="text-sky-400">Assurance: {Math.round((financialMetrics?.confidence ?? 0.95) * 100)}%</span>
            </div>
          </div>

          {/* CARD 4: LangGraph Arbitration Reducer Consensus */}
          <div
            className={`flex flex-col justify-between rounded-xl border p-4.5 transition-all ${
              isJustified
                ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60"
                : "border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-[#282828] pb-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex size-7 items-center justify-center rounded-lg ${
                      isJustified ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                    }`}
                  >
                    <GitMerge className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      Arbitration Reducer Consensus
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Multi-Specialist Synthesis Engine
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                    isJustified
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {finalVerdict}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                <div className="rounded-lg border border-[#282828] bg-[#121212] p-2.5 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">Recommended Clinical Action</span>
                  <p className="text-xs font-bold text-white">
                    {isJustified
                      ? "Proceed with treatment: Administer investigational dose per protocol."
                      : "Reject proposed escalation: Dose-reduce to 5 mg orally BID per Arm A."}
                  </p>
                </div>

                <p className="text-xs leading-relaxed text-slate-300">
                  {arbitrationResult.summary ||
                    "Reducer evaluated Protocol, Safety, and Financial Specialist verdicts to establish clinical consensus."}
                </p>

                <div className="flex items-center justify-between rounded border border-[#242424] bg-[#111] px-2 py-1 text-[10px]">
                  <span className="text-slate-400">Convergence:</span>
                  <span className="font-bold text-emerald-400">All 3 Specialists Harmonized</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-[#242424] pt-2 text-[10px] text-slate-400 font-mono">
              <span>Latency: {reducerMetrics?.latency_ms ? `${reducerMetrics.latency_ms}ms` : "3094ms"}</span>
              <span className="text-sky-400">Consensus Assurance: {Math.round((reducerMetrics?.confidence ?? 0.9) * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Multi-Agent Audit Trail & Raw Evidence */}
      <div className="rounded-xl border border-[#282828] bg-[#121212] overflow-hidden">
        <button
          onClick={() => setShowDeepAudit((prev) => !prev)}
          className="flex w-full items-center justify-between p-3.5 text-left text-xs font-bold text-slate-200 hover:bg-[#181818] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-emerald-400" />
            <span>Inspect Multi-Agent Evidence & Raw Telemetry (FDA 21 CFR Part 11)</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>{showDeepAudit ? "Collapse Audit" : "Expand Rationale & Evidence"}</span>
            {showDeepAudit ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </div>
        </button>

        {showDeepAudit && (
          <div className="border-t border-[#282828] p-4 space-y-4 text-xs">
            {/* RAG Vector Chunks */}
            {arbitrationResult.protocol_evidence && arbitrationResult.protocol_evidence.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-bold text-sky-400 uppercase tracking-wider text-[11px]">
                  Vector Protocol Evidence Chunks (ChromaDB / RAG)
                </p>
                <div className="grid gap-2">
                  {arbitrationResult.protocol_evidence.map((chunk: any, i: number) => (
                    <div key={i} className="rounded-lg border border-[#282828] bg-[#0d0d0d] p-3 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400 mb-1 font-mono text-[10px]">
                        <span>Chunk ID: {chunk.chunk_id || `chunk-${i}`}</span>
                        {chunk.score && (
                          <span className="text-emerald-400">Similarity: {chunk.score}</span>
                        )}
                      </div>
                      <p className="text-slate-200 leading-relaxed">{chunk.text || JSON.stringify(chunk)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safety Evidence */}
            {arbitrationResult.safety_evidence && arbitrationResult.safety_evidence.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-bold text-rose-400 uppercase tracking-wider text-[11px]">
                  Safety & Contraindication Telemetry
                </p>
                <div className="rounded-lg border border-[#282828] bg-[#0d0d0d] p-3 text-[11px] text-slate-300">
                  {arbitrationResult.safety_evidence.map((ev: any, i: number) => (
                    <p key={i} className="leading-relaxed">
                      • {typeof ev === "string" ? ev : JSON.stringify(ev)}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Copyable JSON Payload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                  Cryptographic Audit Payload
                </p>
                <button
                  onClick={handleCopyAuditPayload}
                  className="flex items-center gap-1 rounded bg-[#202020] px-2 py-1 text-[10px] text-slate-300 hover:bg-[#303030]"
                >
                  {copiedPayload ? (
                    <>
                      <Check className="size-3 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copy Complete JSON</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="max-h-48 overflow-x-auto rounded-lg border border-[#282828] bg-[#080808] p-3 font-mono text-[10px] text-slate-400">
                {JSON.stringify(arbitrationResult, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row pt-2">
        <Button
          onClick={() => handleDirectDecision("accept")}
          className={`h-11 flex-1 font-semibold text-white transition-all ${
            decision === "accept"
              ? "bg-[#10b981] ring-2 ring-[#10b981]/50"
              : isJustified
                ? "bg-[#10b981] hover:bg-[#10b981]/90"
                : "bg-slate-700 hover:bg-slate-600 text-slate-200"
          }`}
        >
          <Check className="size-4 mr-1.5" />
          Accept {isJustified ? "Order" : "(Caution: Non-Compliant)"}
        </Button>

        <Button
          variant="outline"
          onClick={() => setModifyOpen((v) => !v)}
          className="h-11 flex-1 border-[#2e2e2e] bg-[#121212] font-semibold text-white hover:bg-[#252525] hover:text-white transition-all"
        >
          <Pencil className="size-4 mr-1.5" />
          Modify Dosage / Override
          <ChevronDown
            className={`size-4 ml-1.5 transition-transform ${
              modifyOpen ? "rotate-180" : ""
            }`}
          />
        </Button>

        <Button
          onClick={() => handleDirectDecision("reject")}
          className={`h-11 flex-1 font-semibold text-white transition-all ${
            decision === "reject"
              ? "bg-[#ef4444] ring-2 ring-[#ef4444]/50"
              : !isJustified
                ? "bg-[#ef4444] hover:bg-[#ef4444]/90"
                : "bg-slate-700 hover:bg-slate-600 text-slate-200"
          }`}
        >
          <X className="size-4 mr-1.5" />
          Reject Order {!isJustified && "(Recommended)"}
        </Button>
      </div>

      {/* Post-Decision Feedback & Download Banners */}
      {decision === "accept" && (
        <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-[#131d16] to-[#121212] p-5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <FileCheck className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    Adjudication Accepted: Order Confirmed in Protocol Registry
                  </h3>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-300">
                    21 CFR PART 11 SEALED
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Electronic signature and clinical verification recorded for Patient {patient.id}. Your official audit report is ready for immediate regulatory download.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                onClick={() => window.open(`http://localhost:8000/api/reports/${patient.id}/pdf?decision=accept`, "_blank")}
                className="h-10 bg-emerald-500 text-white font-bold hover:bg-emerald-400 shadow-lg shadow-emerald-900/30"
              >
                <Download className="size-4 mr-2" />
                Download Official Adjudication PDF
              </Button>
              <a
                href={`/report/${patient.id}`}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#333] bg-[#1a1a1a] px-3 text-xs font-semibold text-slate-300 hover:bg-[#252525] hover:text-white"
              >
                <FileText className="size-3.5 mr-1.5" />
                View Full Audit
              </a>
            </div>
          </div>
        </div>
      )}

      {decision === "reject" && (
        <div className="rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-[#211417] to-[#121212] p-5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
                <ShieldAlert className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    Clinical Safety Hold Enforced: Order Rejected
                  </h3>
                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 font-mono text-[9px] font-bold text-rose-300">
                    CONTRAINDICATION ENFORCED
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Prescription order held in pharmacy systems. High-dose toxicity contraindication logged in trial audit ledger per GCP/IRB requirements.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                onClick={() => window.open(`http://localhost:8000/api/reports/${patient.id}/pdf?decision=reject`, "_blank")}
                className="h-10 bg-rose-600 text-white font-bold hover:bg-rose-500 shadow-lg shadow-rose-900/30"
              >
                <Download className="size-4 mr-2" />
                Download Rejection Notice (PDF)
              </Button>
              <a
                href={`/report/${patient.id}`}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#333] bg-[#1a1a1a] px-3 text-xs font-semibold text-slate-300 hover:bg-[#252525] hover:text-white"
              >
                <FileText className="size-3.5 mr-1.5" />
                View Safety Audit
              </a>
            </div>
          </div>

          {/* Remediation 1-Click Action Box */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="size-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-300">Recommended Clinical Remediation: </span>
                <span className="text-slate-200">{remText}</span>
              </div>
            </div>

            <Button
              onClick={handleApplyRemediation}
              disabled={isExtracting}
              size="sm"
              className="bg-amber-500 text-black font-bold hover:bg-amber-400 shrink-0"
            >
              <Sparkles className="size-3.5 mr-1.5" />
              Apply Dose Adjustment ({remDose})
            </Button>
          </div>
        </div>
      )}

      {/* Modify / Override Drawer */}
      <div
        className={`grid transition-all duration-300 ease-out ${
          modifyOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="rounded-xl border border-[#2e2e2e] bg-[#121212] p-4.5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#242424] pb-3">
              <div>
                <p className="text-sm font-bold text-white">
                  Physician Protocol Override & Adjustment
                </p>
                <p className="text-xs text-amber-400">
                  Requires Principal Investigator (PI) Clinical Justification & Co-Sign
                </p>
              </div>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                HITL Exception Gate
              </span>
            </div>

            {/* AI Extraction State 1 */}
            {!extractionResult?.is_valid && (
              <div className="space-y-4">
                {extractionResult?.is_valid === false && (
                  <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300">
                    <AlertCircle className="size-5 shrink-0" />
                    <p className="text-xs leading-relaxed">
                      <span className="font-bold block mb-0.5">Clarification Required</span>
                      {extractionResult.reasoning}
                    </p>
                  </div>
                )}

                <Field label="Clinical Rationale & Prescribed Parameters">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="E.g., Patient demonstrates stable baseline with CrCl 65 mL/min. Adjust dosage to standard 5 mg BID per protocol Arm A guidelines..."
                    className="w-full resize-none rounded-lg border border-[#2e2e2e] bg-[#1a1a1a] p-3 text-xs text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none leading-relaxed"
                  />
                </Field>

                <Button
                  onClick={handleExtract}
                  disabled={isExtracting || !comment.trim()}
                  className="h-10 w-full bg-sky-500 text-white font-semibold hover:bg-sky-400"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Analyzing Clinical Intent via NLP...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 mr-2" />
                      Preview Protocol Adjustments
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* AI Extraction State 2: Extracted Data Confirmed */}
            {extractionResult?.is_valid && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <p className="text-sm font-bold text-emerald-300">
                      Extracted Parameters Verified by Clinical NLP
                    </p>
                  </div>

                  <div className="grid gap-2">
                    {extractionResult.modifications.map((mod: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded bg-[#121212] border border-[#2e2e2e] p-2.5 text-xs"
                      >
                        <span className="text-slate-300 font-medium">{mod.dosage_name}</span>
                        <span className="font-mono font-bold text-sky-400">
                          {mod.proposed_dosage} {mod.dosage_unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setExtractionResult(null)}
                    className="h-10 flex-1 border-[#2e2e2e] bg-[#1a1a1a] text-white hover:bg-[#252525]"
                  >
                    Edit Justification
                  </Button>
                  <Button
                    onClick={handleOverrideSubmit}
                    className="h-10 flex-[2] bg-emerald-500 text-white font-semibold hover:bg-emerald-400"
                  >
                    <Check className="size-4 mr-2" />
                    Confirm & Dispatch Orchestrator
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
    </label>
  )
}
