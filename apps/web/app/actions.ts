"use server"

import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { getGatewayUrl } from "@/lib/api-config"
import { targetDose, matchesTargetDose, matchesPrescriptionAction, postDecision, savePatientChange } from "@/lib/prescription"
import { checkDosePolicy, enforceDoseResult } from "@/lib/dose-policy.mjs"

export async function getPatientsFromSupabase() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""

  if (!url || !key) {
    console.warn("Supabase credentials not configured in environment; returning empty patient list.")
    return []
  }

  const supabaseServer = createClient(url, key)
  const { data, error } = await supabaseServer.from("patients").select("*")
  if (error) {
    console.error("Error fetching patients from Supabase:", error)
    throw new Error(`Supabase query failed: ${error.message}`)
  }
  return data || []
}

export type ProtocolViolation = {
  name: string
  parameter?: string
  observed: string
  limit: string
  expected?: string
  difference?: string
  reference: string
  protocol_text?: string
  reason?: string
  clinical_implication?: string
}

export type Guardrail1Result = {
  passed: boolean
  status: "PASSED" | "FAILED" | "EXCLUDED_MAX_ITERS"
  locked?: boolean
  resupply_attempts?: number
  max_iters?: number
  missing_fields: string[]
  reason: string
  regulatory_citation: string
  action_required: string
}

export type Guardrail2Breach = {
  rule_id: string
  parameter: string
  observed: string
  limit: string
  difference: string
  severity: string
  reason: string
}

export type Guardrail2Result = {
  passed: boolean
  status: "PASSED" | "BREACHED"
  short_circuited: boolean
  breached_boundaries: Guardrail2Breach[]
  reason: string
  regulatory_citation: string
  action_required: string
}

export type RagRuleViolation = {
  rule_id: string
  parameter: string
  observed: string
  limit: string
  expected?: string
  difference: string
  reference: string
  protocol_text?: string
  reason: string
  clinical_implication?: string
}

export type RagRuleResult = {
  compliant: boolean
  status: "COMPLIANT" | "NON_COMPLIANT"
  violations: RagRuleViolation[]
  reason: string
}

export type AgentDiscrepancies = {
  has_discrepancy: boolean
  consensus_status: "UNANIMOUS_CONSENSUS_JUSTIFIED" | "CONSENSUS_REJECTED"
  dissenting_agents: string[]
  reasons: Record<string, string>
}

export type ArbitrationResult = {
  patientId: string
  patient_profile?: Record<string, any>
  recommendationTitle?: string
  recommendationSummary?: string
  protocolsViolated?: ProtocolViolation[]
  financialExposure?: number
  final_verdict?: "JUSTIFIED" | "NOT_JUSTIFIED" | "NEEDS_REVIEW"
  summary?: string
  prescribed_action?: string
  recent_action?: Record<string, string | null>
  protocol_compliance_result?: {
    compliance_status?: "COMPLIANT" | "NON_COMPLIANT" | "UNKNOWN"
    valid?: boolean
    violations?: Array<Record<string, unknown>>
    explanation?: string
    confidence?: number
  }
  safety_result?: {
    safety_status?: "SAFE" | "UNSAFE" | "NEEDS_REVIEW"
    safe?: boolean
    concerns?: Array<Record<string, unknown>>
    explanation?: string
    confidence?: number
  }
  financial_result?: {
    coverage_status?: "COVERED" | "NOT_COVERED" | "REQUIRES_PRE_AUTH"
    tier?: string
    pre_auth_required?: boolean
    sponsor_billing_eligible?: boolean
    financialExposure?: number
    explanation?: string
    callout?: string
    confidence?: number
  }
  agent_metrics?: Record<string, { latency_ms?: number; confidence?: number }>
  protocol_evidence?: Array<Record<string, unknown>>
  safety_evidence?: Array<Record<string, unknown>>
  financial_evidence?: Array<Record<string, unknown>>
  iteration_count?: number
  needs_human_review?: boolean
  report_history?: Array<{
    iteration: number
    agent: string
    verdict: string
    status: string
    explanation?: string
    confidence?: number | string | null
    violations?: Array<Record<string, unknown>>
    concerns?: Array<Record<string, unknown>>
  }>
  modifications?: Array<Record<string, unknown>>
  guardrail_1_result?: Guardrail1Result
  guardrail_2_result?: Guardrail2Result
  rag_rule_result?: RagRuleResult
  agent_discrepancies?: AgentDiscrepancies
}


export async function getArbitrationResult(patientId: string, overrideAction?: string): Promise<ArbitrationResult> {
  const baseUrl = getGatewayUrl()
  const isVercelWithoutGateway = Boolean(
    process.env.VERCEL && !process.env.GATEWAY_URL && !process.env.NEXT_PUBLIC_GATEWAY_URL
  )


  // Attempt to fetch from gateway API with retry if running locally or with an explicit external gateway configured
  if (!isVercelWithoutGateway && baseUrl) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2500)
        const response = await fetch(
          `${baseUrl}/api/hitl/package/${encodeURIComponent(patientId)}`,
          { cache: "no-store", signal: controller.signal }
        )
        clearTimeout(timeoutId)

        if (response.ok) {
          const pkg = await response.json()
          const matchesRequestedAction = !overrideAction ||
            matchesPrescriptionAction(pkg?.prescribed_action, overrideAction)
          if (matchesRequestedAction && pkg && (pkg.patientId || pkg.patient_profile || pkg.final_verdict)) {
            return enforceDoseResult(pkg)
          }
        }
      } catch (err) {
        // transient connection error; retry if remaining
      }
      if (attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }
  }

  if (overrideAction && !isVercelWithoutGateway && baseUrl) {
    throw new Error("The updated prescription has not completed evaluation. Please retry.")
  }

  throw new Error("Clinical evaluation is unavailable. No approval can be established; reconnect to the gateway and retry.")
}

// Clinical formulary definitions with synonyms, brand names, and phonetic misspellings
const FORMULARY_REGISTRY: Record<
  string,
  {
    canonical: string
    defaultDose: number
    defaultUnit: string
    defaultRoute: string
    defaultFrequency: string
    defaultTiming: string
    targetField: string
    synonyms: string[]
  }
> = {
  apixaban: {
    canonical: "Apixaban",
    defaultDose: 5,
    defaultUnit: "mg",
    defaultRoute: "oral",
    defaultFrequency: "twice daily",
    defaultTiming: "Every 12 hours (08:00, 20:00)",
    targetField: "MedicationRequest.dosageInstruction[0]",
    synonyms: [
      "apixaban", "apixiban", "apixibam", "apixabam", "apixab", "apixban",
      "eliquis", "eliquiss", "eliqus", "factor xa inhibitor",
    ],
  },
  pembrolizumab: {
    canonical: "Pembrolizumab",
    defaultDose: 200,
    defaultUnit: "mg",
    defaultRoute: "IV",
    defaultFrequency: "every 3 weeks",
    defaultTiming: "Day 1 of 21-day cycle (09:00)",
    targetField: "MedicationRequest.dosageInstruction[0]",
    synonyms: [
      "pembrolizumab", "pemprolizumab", "pembroliz", "pembro",
      "keytruda", "keytrudaa", "anti-pd1", "checkpoint inhibitor",
    ],
  },
  empagliflozin: {
    canonical: "Empagliflozin",
    defaultDose: 10,
    defaultUnit: "mg",
    defaultRoute: "oral",
    defaultFrequency: "once daily",
    defaultTiming: "Every 24 hours (08:00)",
    targetField: "MedicationRequest.dosageInstruction[0]",
    synonyms: [
      "empagliflozin", "empaglifozin", "empagliflozinum", "empa",
      "jardiance", "jardians", "sglt2 inhibitor",
    ],
  },
  pioglitazone: {
    canonical: "Pioglitazone",
    defaultDose: 30,
    defaultUnit: "mg",
    defaultRoute: "oral",
    defaultFrequency: "once daily",
    defaultTiming: "Every 24 hours (08:00)",
    targetField: "MedicationRequest.dosageInstruction[0]",
    synonyms: [
      "pioglitazone", "pioglitazone hcl", "pio", "actos", "actoss",
      "thiazolidinedione",
    ],
  },
  atorvastatin: {
    canonical: "Atorvastatin",
    defaultDose: 20,
    defaultUnit: "mg",
    defaultRoute: "oral",
    defaultFrequency: "once daily",
    defaultTiming: "Every 24 hours (20:00)",
    targetField: "MedicationRequest.dosageInstruction[0]",
    synonyms: [
      "atorvastatin", "atorvastin", "atorva", "lipitor", "statin",
    ],
  },
  aspirin: {
    canonical: "Aspirin",
    defaultDose: 81,
    defaultUnit: "mg",
    defaultRoute: "oral",
    defaultFrequency: "once daily",
    defaultTiming: "Every 24 hours (08:00)",
    targetField: "MedicationRequest.dosageInstruction[0]",
    synonyms: ["aspirin", "asa", "acetylsalicylic acid", "bayer"],
  },
  clopidogrel: {
    canonical: "Clopidogrel",
    defaultDose: 75,
    defaultUnit: "mg",
    defaultRoute: "oral",
    defaultFrequency: "once daily",
    defaultTiming: "Every 24 hours (08:00)",
    targetField: "MedicationRequest.dosageInstruction[0]",
    synonyms: ["clopidogrel", "clopidogril", "plavix"],
  },
}

export type ClinicalExtractionResult = {
  is_valid: boolean
  is_appropriate: boolean
  warning: string | null
  standardized_drug?: string
  original_spelling?: string
  spelling_corrected?: boolean
  dosage?: number
  dosage_unit?: string
  route?: string
  frequency?: string
  timing_schedule?: string
  standardized_action?: string
  target_fhir_field?: string
  target_fhir_updates?: Record<string, any>
  reasoning: string
  modifications?: Array<{
    dosage_name: string
    proposed_dosage: number | string
    dosage_unit: string
    frequency: string
    route?: string
    timing_schedule?: string
    target_field?: string
  }>
}

export async function processClinicalComment(comment: string): Promise<ClinicalExtractionResult> {
  const trimmed = (comment || "").trim()

  // 1. Check for blank or non-actionable input
  if (!trimmed || trimmed.length < 4) {
    return {
      is_valid: false,
      is_appropriate: false,
      warning: "Clinical note is empty or incomplete. An explicit therapeutic intervention order is required.",
      reasoning: "Note contains insufficient clinical detail for evaluation.",
      modifications: [],
    }
  }

  // 1.5 Fast-track standard protocol remediation prompts for instant sub-millisecond response
  const lowerTrimmed = trimmed.toLowerCase()
  const isDirectStandardRemediation =
    lowerTrimmed.startsWith("adjust dosage to standard") ||
    lowerTrimmed.startsWith("titrate apixaban to standard") ||
    lowerTrimmed.startsWith("titrate empagliflozin to standard") ||
    lowerTrimmed.startsWith("administer pembrolizumab at standard") ||
    lowerTrimmed.startsWith("titrate pioglitazone to standard")

  if (!isDirectStandardRemediation) {
    // 2. Attempt remote LLM extraction via Gateway with 1200ms latency ceiling
    const baseUrl = getGatewayUrl()
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1200)
      const response = await fetch(`${baseUrl}/api/extract-comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: trimmed }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      if (data && (data.is_valid === false || data.is_appropriate === false)) {
        return data as ClinicalExtractionResult
      }
      if (data?.is_valid && matchesTargetDose(trimmed, data)) {
        const first = data.modifications[0]
        const drug = first.dosage_name
        const dose = Number(first.proposed_dosage)
        const unit = first.dosage_unit
        const route = first.route
        const freq = first.frequency
        if (!drug || !route || !freq) throw new Error("Incomplete remote prescription")
        const timing = data.timing_schedule || first.timing_schedule || freq
        const action = `${drug} ${dose} ${unit} ${route} ${freq}`
        const doseCheck = checkDosePolicy(action)
        if (doseCheck.status !== "WITHIN_LIMIT") return { is_valid: false, is_appropriate: false, warning: doseCheck.reason, reasoning: doseCheck.reason, modifications: [] }
        return {
          is_valid: true,
          is_appropriate: true,
          warning: null,
          standardized_drug: drug,
          dosage: dose,
          dosage_unit: unit,
          route,
          frequency: freq,
          timing_schedule: timing,
          standardized_action: action,
          target_fhir_field: "MedicationRequest.dosageInstruction[0]",
          target_fhir_updates: {
            field: "MedicationRequest.dosageInstruction",
            dose: `${dose} ${unit}`,
            timing: timing,
            frequency: freq,
            route,
          },
          reasoning: `Prescription text extracted: ${action}. Clinical review is still required.`,
          modifications: [
            {
              dosage_name: drug,
              proposed_dosage: dose,
              dosage_unit: unit,
              frequency: freq,
              route,
              timing_schedule: timing,
              target_field: "MedicationRequest.dosageInstruction[0]",
            },
          ],
        }
      }
    }
  } catch (err) {
    // transient gateway error; proceed to deterministic LLM / clinical NLP evaluator
  }
}

  // 3. Clinical NLP / LLM Evaluator Logic (Fuzzy match, spelling correction, appropriateness filtering)
  const lower = trimmed.toLowerCase()

  // Detection of purely conversational or non-clinical phrases
  const conversationalPhrases = [
    "hello", "hi there", "good morning", "good afternoon", "how are you",
    "weather is", "sunny", "nice day", "lunch", "dinner", "cancel this",
    "just testing", "asdf", "qwerty", "random note", "no comment"
  ]
  const isConversational = conversationalPhrases.some((phrase) => lower.includes(phrase))

  // Detection of vague directives without explicit dosage
  const isVague =
    (/\b(lower|increase|decrease|reduce|titrate|adjust|change)\b/.test(lower) &&
      !/\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?)/i.test(lower)) ||
    (/^(please accept|accept this|override this|approve this|proceed)\b/i.test(trimmed) &&
      !/\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?)/i.test(lower))

  // Find candidate drug match (including fuzzy spelling variations)
  let matchedKey: string | null = null
  let matchedOriginal: string = ""
  for (const [key, entry] of Object.entries(FORMULARY_REGISTRY)) {
    for (const syn of entry.synonyms) {
      if (lower.includes(syn)) {
        matchedKey = key
        matchedOriginal = syn
        break
      }
    }
    if (matchedKey) break
  }

  // If vague without numbers or purely conversational: Trigger Clinical Warning
  if (isConversational || (isVague && !matchedKey)) {
    return {
      is_valid: false,
      is_appropriate: false,
      warning:
        "Clinical Warning: The submitted note lacks actionable prescription parameters. Non-clinical or conversational text detected. Please specify a recognizable drug name and quantitative dosage (e.g., 'Apixaban 5 mg oral twice daily').",
      reasoning: "No quantitative dosage or valid formulary medication identified in clinician narrative.",
      modifications: [],
    }
  }

  if (isVague && matchedKey) {
    const entry = FORMULARY_REGISTRY[matchedKey]
    return {
      is_valid: false,
      is_appropriate: false,
      warning: `Clinical Warning: Ambiguous titration directive for ${entry.canonical}. A specific quantitative numerical dosage (e.g. "${entry.defaultDose} ${entry.defaultUnit}") is required to execute this override safely.`,
      reasoning: `Medication "${entry.canonical}" identified, but target numerical dosage was not specified in the doctor's note.`,
      modifications: [],
    }
  }

  const quantity = targetDose(trimmed)
  if (!quantity || !matchedKey) {
    return { is_valid: false, is_appropriate: false, warning: "Specify one identifiable medication and an explicit positive target dose with units.", reasoning: "Missing or ambiguous target prescription.", modifications: [] }
  }
  const doseNum = quantity.value
  const unitStr = quantity.unit
  const entry = FORMULARY_REGISTRY[matchedKey]
  const canonicalDrug = entry.canonical
  const spellingCorrected = Boolean(matchedOriginal && matchedOriginal.toLowerCase() !== canonicalDrug.toLowerCase())

  // Parse frequency & route
  let frequency = entry.defaultFrequency
  let timingSchedule = entry.defaultTiming
  const weekMatch = /\b(?:q(\d+)w|every\s+(\d+)\s+weeks?|q(21|42)d)\b/i.exec(lower)
  let route = entry.defaultRoute

  if (lower.includes("bid") || lower.includes("twice daily") || lower.includes("twice a day") || lower.includes("q12h")) {
    frequency = "twice daily"
    timingSchedule = "Every 12 hours (08:00, 20:00)"
  } else if (lower.includes("qd") || lower.includes("once daily") || lower.includes("daily") || lower.includes("q24h")) {
    frequency = "once daily"
    timingSchedule = "Every 24 hours (08:00)"
  } else if (weekMatch) {
    const weeks = Number(weekMatch[1] || weekMatch[2] || Number(weekMatch[3]) / 7)
    frequency = `every ${weeks} weeks`
    timingSchedule = `Every ${weeks} weeks`
  } else if (lower.includes("tid") || lower.includes("three times")) {
    frequency = "three times daily"
    timingSchedule = "Every 8 hours (08:00, 14:00, 20:00)"
  }

  if (/\b(iv|intravenous|infusion)\b/i.test(lower)) {
    route = "IV"
  } else if (lower.includes("oral") || lower.includes("po") || lower.includes("by mouth")) {
    route = "oral"
  }

  const standardizedAction = `${canonicalDrug} ${doseNum} ${unitStr} ${route} ${frequency}`
  const doseCheck = checkDosePolicy(standardizedAction)
  if (doseCheck.status !== "WITHIN_LIMIT") return { is_valid: false, is_appropriate: false, warning: doseCheck.reason, reasoning: doseCheck.reason, modifications: [] }

  return {
    is_valid: true,
    is_appropriate: true,
    warning: null,
    standardized_drug: canonicalDrug,
    original_spelling: matchedOriginal || canonicalDrug,
    spelling_corrected: spellingCorrected,
    dosage: doseNum,
    dosage_unit: unitStr,
    route,
    frequency,
    timing_schedule: timingSchedule,
    standardized_action: standardizedAction,
    target_fhir_field: entry.targetField,
    target_fhir_updates: {
      field: "MedicationRequest.dosageInstruction[0]",
      dose: `${doseNum} ${unitStr}`,
      timing: timingSchedule,
      frequency,
      route,
    },
    reasoning: spellingCorrected
      ? `Prescription text extracted. Normalized misspelling/synonym "${matchedOriginal}" to standard trial drug "${canonicalDrug}". Parsed parameters: ${doseNum} ${unitStr} ${route} ${frequency} (${timingSchedule}).`
      : `Prescription text extracted; clinical review required: ${canonicalDrug} ${doseNum} ${unitStr} ${route} ${frequency} (${timingSchedule}).`,
    modifications: [
      {
        dosage_name: canonicalDrug,
        proposed_dosage: doseNum,
        dosage_unit: unitStr,
        frequency,
        route,
        timing_schedule: timingSchedule,
        target_field: entry.targetField,
      },
    ],
  }
}

export async function updateFhirDatabase(
  patientId: string,
  prescriptionDetails: {
    standardized_action: string
    standardized_drug: string
    dosage: number | string
    dosage_unit: string
    route: string
    frequency: string
    timing_schedule: string
    doctor_note?: string
    target_fhir_field?: string
  },
  confirmed: boolean = false,
) {
  try {
    const result = await savePatientChange(getGatewayUrl(), "/api/fhir/update", {
      patientId, ...prescriptionDetails, confirmed,
    }, patientId, prescriptionDetails.standardized_action)
    return { success: true, patientId, standardized_action: result.prescribed_action, persistence: result.persistence }
  } catch (error) {
    return { success: false, patientId, error: error instanceof Error ? error.message : "The database save could not be confirmed." }
  }
}

export async function submitDecision(
  patientId: string, 
  decision: "accept" | "reject" | "override", 
  justification?: string,
  modifications?: any[],
  fullExtractionResult?: any,
  confirmed: boolean = false,
) {
  let standardizedAction = ""
  if (decision === "override") {
    if (fullExtractionResult?.standardized_action) {
      standardizedAction = fullExtractionResult.standardized_action
    } else if (Array.isArray(modifications) && modifications.length > 0) {
      const mod = modifications[0]
      if (mod?.dosage_name && mod?.proposed_dosage) {
        if ([mod.dosage_unit, mod.route, mod.frequency].every((field) => typeof field === "string" && field.trim())) {
          standardizedAction = `${mod.dosage_name} ${mod.proposed_dosage} ${mod.dosage_unit} ${mod.route} ${mod.frequency}`
        }
      }
    }

    if (!standardizedAction || fullExtractionResult?.is_valid === false || fullExtractionResult?.is_appropriate === false) {
      return { status: "error", decision, patientId, error: "A valid extracted prescription is required before modifying the order." }
    }
  }

  const payload = {
    patientId,
    decision,
    confirmed,
    timestamp: new Date().toISOString(),
    justification: justification || null,
    modifications: modifications || [],
    extraction_details: fullExtractionResult || null,
    prescribed_action: standardizedAction || undefined,
  }

  const baseUrl = getGatewayUrl()
  const endpoint = decision === "override" 
    ? `${baseUrl}/api/orchestrator/resume`     
    : `${baseUrl}/api/orchestrator/checkpoint`

  if (decision === "override") {
    try {
      const result = await savePatientChange(baseUrl, "/api/orchestrator/resume", payload, patientId, standardizedAction)
        return { status: "restarting", decision, patientId, prescribed_action: result.prescribed_action, persistence: result.persistence }
    } catch (error) {
      // Expected save failures must survive production Server Action error redaction.
      return { status: "error", decision, patientId, error: error instanceof Error ? error.message : "The database save could not be confirmed." }
    }
  }
  try {
    if (decision === "accept") {
      const evaluation = await getArbitrationResult(patientId)
      const policy = checkDosePolicy(evaluation.prescribed_action)
      if (policy.status !== "WITHIN_LIMIT") throw new Error(policy.reason)
    }
    await postDecision(endpoint, payload)
    return { status: "success", decision, patientId }
  } catch (error) {
    return { status: "error", decision, patientId, error: error instanceof Error ? error.message : "The decision was not confirmed." }
  }

}

export async function resupplyPatientData(
  patientId: string,
  resupplied: { age?: number | string | null; sex?: string | null },
  attemptNumber: number = 1,
  maxIters: number = 3,
  justification?: string,
) {
  const age = resupplied.age === undefined || resupplied.age === null || String(resupplied.age).trim() === ""
    ? null : Number(resupplied.age)
  if (age !== null && (!Number.isFinite(age) || age <= 0)) throw new Error("Enter a valid positive age.")
  const rawSex = String(resupplied.sex || "").trim().toLowerCase()
  const sex = rawSex.startsWith("f") ? "female" : rawSex.startsWith("m") ? "male" : null
  if (rawSex && !sex) throw new Error("Select a valid biological sex.")
  const payload = {
    patientId, confirmed: true, resupplied: { age, sex }, attempt_number: attemptNumber,
    max_iters: maxIters, justification: justification || "Clinician demographic resupply",
  }
  if (age === null && sex === null) {
    const response = await postDecision(`${getGatewayUrl()}/api/orchestrator/resupply`, payload)
    return response.json()
  }
  let result
  try {
    result = await savePatientChange(getGatewayUrl(), "/api/orchestrator/resupply", payload, patientId)
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "The database save could not be confirmed." }
  }
  return result
}
