import policy from './dose-policy.json' with { type: 'json' }

export const DOSE_POLICY_VERSION = policy.version

export function checkDosePolicy(action) {
  const unverified = { status: 'UNVERIFIED', reason: 'The drug, dose, units, route or frequency has no verified demo dose rule. Clinical review is required.' }
  if (typeof action !== 'string') return unverified
  const match = /^\s*([a-z][a-z -]*?)\s+((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)\s*(mg|mcg|ug|µg|g)\s+(oral|po|iv|intravenous)\s+(.+?)\s*$/i.exec(action)
  if (!match) return unverified
  const [, drug, amount, unit, rawRoute, rawFrequency] = match
  const profile = policy.drugs[drug.trim().toLowerCase()]
  if (!profile) return unverified
  const dose = Number(amount.replaceAll(',', '')) * ({ mg: 1, mcg: .001, ug: .001, 'µg': .001, g: 1000 })[unit.toLowerCase()]
  if (!Number.isFinite(dose) || dose <= 0) return unverified
  const route = ['iv', 'intravenous'].includes(rawRoute.toLowerCase()) ? 'IV' : 'oral'
  let frequency = rawFrequency.toLowerCase().trim().replace(/\s+/g, ' ')
  frequency = ({ bid: 'twice daily', 'twice a day': 'twice daily', q12h: 'twice daily', qd: 'once daily', daily: 'once daily', q24h: 'once daily', q3w: 'every 3 weeks', q6w: 'every 6 weeks' })[frequency] || frequency
  const regimen = profile.regimens.find((r) => r.route === route && r.frequency === frequency)
  const ceiling = regimen?.max_mg ?? Math.max(...profile.regimens.map((r) => r.max_mg))
  const result = { drug: profile.name, dose_mg: dose, max_mg: ceiling, policy_version: policy.version }
  if (dose > ceiling) return { ...result, status: 'EXCEEDS_LIMIT', reason: `${profile.name} ${dose} mg exceeds the configured demo limit of ${ceiling} mg per administration. The order is blocked.` }
  if (!regimen || !regimen.allowed_mg.includes(dose)) return { ...unverified, ...result }
  return { ...result, status: 'WITHIN_LIMIT', reason: 'Within the configured demo dose boundary; patient-specific safety and protocol review are still required.' }
}

export function enforceDoseResult(result) {
  const dose = checkDosePolicy(result?.prescribed_action)
  if (dose.status === 'WITHIN_LIMIT') return result
  const rejected = dose.status === 'EXCEEDS_LIMIT' || result?.final_verdict === 'NOT_JUSTIFIED'
  return { ...result, dose_policy_result: dose, final_verdict: rejected ? 'NOT_JUSTIFIED' : 'NEEDS_REVIEW',
    needs_human_review: true, summary: dose.reason, recommendationSummary: dose.reason,
    recommendationTitle: 'Prescription blocked: dose review required',
    protocol_compliance_result: { ...result?.protocol_compliance_result, valid: false, compliance_status: rejected ? 'NON_COMPLIANT' : 'UNKNOWN', explanation: dose.reason },
    safety_result: { ...result?.safety_result, safe: false, safety_status: rejected ? 'UNSAFE' : 'NEEDS_REVIEW', explanation: dose.reason },
    rag_rule_result: { ...result?.rag_rule_result, compliant: false, status: rejected ? 'NON_COMPLIANT' : 'UNKNOWN', reason: dose.reason },
    agent_discrepancies: { ...result?.agent_discrepancies, has_discrepancy: true, consensus_status: 'CONSENSUS_REJECTED',
      dissenting_agents: [...new Set([...(result?.agent_discrepancies?.dissenting_agents || []), 'Dose validation'])],
      reasons: { ...result?.agent_discrepancies?.reasons, 'Dose validation': dose.reason } } }
}
