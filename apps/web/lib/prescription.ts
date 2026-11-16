/** Extract an explicit target quantity, preserving a changed-to dose. */
export function targetDose(note: string): { value: number; unit: string } | null {
  const quantity = String.raw`(?<![\w.-])(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|units?)\b(?!\s*\/)`
  const target = new RegExp(String.raw`\b(?:to|at)\s*${quantity}`, "i").exec(note)
  const all = [...note.matchAll(new RegExp(quantity, "gi"))]
  const match = target || (all.length === 1 ? all[0] : null)
  if (!match || !Number.isFinite(Number(match[1])) || Number(match[1]) <= 0) return null
  return { value: Number(match[1]), unit: match[2].toLowerCase() }
}

/** Check remote extraction against the explicit target before accepting it. */
export function matchesTargetDose(note: string, extraction: {
  dosage?: number; dosage_unit?: string;
  modifications?: Array<{ proposed_dosage?: number | string; dosage_unit?: string }>;
}): boolean {
  const target = targetDose(note)
  const mods = extraction.modifications
  if (!target || !mods || mods.length !== 1) return false
  const mod = mods[0]
  return Number(mod.proposed_dosage) === target.value &&
    mod.dosage_unit?.toLowerCase() === target.unit &&
    (extraction.dosage === undefined || Number(extraction.dosage) === target.value) &&
    (extraction.dosage_unit === undefined || extraction.dosage_unit.toLowerCase() === target.unit)
}

/** Compare prescriptions without legacy audit notes appended by older gateways. */
export function matchesPrescriptionAction(actual: unknown, expected: string): boolean {
  function normalize(value: unknown): string {
    if (typeof value !== "string") return ""
    let action = value.trim()
    // Only this known trailing annotation is metadata. Keep all clinical fields.
    const annotation = /\s*\(clinician modification:\s*[^()]*\)\s*$/i
    while (annotation.test(action)) action = action.replace(annotation, "").trim()
    return action.replace(/\s+/g, " ").toLowerCase()
  }
  const prescription = normalize(actual)
  return Boolean(prescription && prescription === normalize(expected))
}

export async function postDecision(endpoint: string, payload: unknown, request: typeof fetch = fetch) {
  const response = await request(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(25000),
  })
  if (!response.ok) {
    let detail: unknown
    try { detail = (await response.json()).detail } catch {}
    throw new Error(typeof detail === "string" ? detail : `The update was not confirmed (HTTP ${response.status}). Please retry.`)
  }
  return response
}

export type PrescriptionDraft = {
  note: string
  action: string
  drug: string
  dose: number
  unit: string
  route: string
  frequency: string
  modifications: Array<Record<string, unknown>>
  extraction: Record<string, unknown>
}

/** Freeze the extracted values the user is about to confirm; never infer missing doses. */
export function preparePrescriptionConfirmation(note: string, extraction: any): PrescriptionDraft {
  if (!note.trim() || !extraction?.is_valid || extraction.is_appropriate === false || extraction.modifications?.length !== 1) {
    throw new Error("Extract one complete prescription before confirming the change.")
  }
  const mod = extraction.modifications[0]
  const dose = Number(mod.proposed_dosage)
  const fields = [mod.dosage_name, mod.dosage_unit, mod.route, mod.frequency]
  if (typeof mod.proposed_dosage === "boolean" || !Number.isFinite(dose) || dose <= 0 || fields.some((v) => typeof v !== "string" || !v.trim())) {
    throw new Error("Drug, positive dose, units, route and frequency are required.")
  }
  const [drug, unit, route, frequency] = fields.map((v) => v.trim())
  const action = `${drug} ${dose} ${unit} ${route} ${frequency}`
  const modification = { ...mod, dosage_name: drug, proposed_dosage: dose, dosage_unit: unit, route, frequency }
  return {
    note: note.trim(), action, drug, dose, unit, route, frequency,
    modifications: [modification],
    extraction: { ...extraction, standardized_drug: drug, dosage: dose, dosage_unit: unit, route, frequency,
      standardized_action: action, modifications: [modification] },
  }
}

export async function savePatientChange(
  baseUrl: string, endpoint: string, payload: Record<string, unknown>, patientId: string,
  expectedAction?: string, request: typeof fetch = fetch,
) {
  if (payload.confirmed !== true) throw new Error("Confirm the change before saving.")
  const capability = await request(`${baseUrl}/api/orchestrator/capabilities`, {
    cache: "no-store", signal: AbortSignal.timeout(5000),
  })
  if (!capability.ok) throw new Error("Verified database saving is unavailable. The change was not submitted.")
  const support = await capability.json()
  if (support.confirmed_prescription_updates !== true || support.persistence !== "supabase_verified") {
    throw new Error("The gateway cannot confirm database saves yet. The change was not submitted.")
  }
  const response = await postDecision(`${baseUrl}${endpoint}`, payload, request)
  const result = await response.json()
  const receipt = result?.persistence
  const samePatient = (value: unknown) => typeof value === "string" && value.trim().toUpperCase() === patientId.trim().toUpperCase()
  if (!samePatient(result?.patientId) || !samePatient(receipt?.patient_id) || receipt?.storage !== "supabase" || receipt?.verified !== true ||
      typeof receipt.updated_at !== "string" || !Number.isFinite(Date.parse(receipt.updated_at)) ||
      (expectedAction && (!matchesPrescriptionAction(receipt.prescribed_action, expectedAction) || !matchesPrescriptionAction(result.prescribed_action, expectedAction)))) {
    throw new Error("The database save could not be verified. Keep your note and check the patient record before retrying.")
  }
  return result
}
