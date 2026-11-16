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
    body: JSON.stringify(payload), signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`The update was not confirmed (HTTP ${response.status}). Please retry.`)
  return response
}
