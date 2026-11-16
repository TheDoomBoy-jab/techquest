import test from 'node:test'
import assert from 'node:assert/strict'
import { checkDosePolicy, enforceDoseResult } from '../lib/dose-policy.mjs'
import { preparePrescriptionConfirmation, savePatientChange } from '../lib/prescription.ts'

test('numeric boundaries catch arbitrary amounts and normalized mass units', () => {
  for (const amount of ['10 mg', '10000 mg', '100000 mg', '9999 mg', '10001 mg', '10 g', '10000000 mcg', '10,000 mg']) {
    assert.equal(checkDosePolicy(`Apixaban ${amount} oral twice daily`).status, 'EXCEEDS_LIMIT')
  }
  for (const amount of ['5 mg', '.005 g', '5000 mcg']) assert.equal(checkDosePolicy(`Apixaban ${amount} oral BID`).status, 'WITHIN_LIMIT')
  for (const action of ['Unknown 5 mg oral daily', 'Apixaban 0 mg oral BID', 'Apixaban 5 mL oral BID', 'Apixaban 5 mg IV BID', 'Apixaban 1e4 mg oral BID']) {
    assert.equal(checkDosePolicy(action).status, 'UNVERIFIED')
  }
})

test('biologic limits depend on the administration interval', () => {
  assert.equal(checkDosePolicy('Pembrolizumab 400 mg IV every 3 weeks').status, 'EXCEEDS_LIMIT')
  assert.equal(checkDosePolicy('Pembrolizumab 400 mg IV every 6 weeks').status, 'WITHIN_LIMIT')
})

test('the reported old P010 approval is blocked when displayed', () => {
  const old = { patientId: 'P010', prescribed_action: 'Apixaban 100000 mg oral twice daily', final_verdict: 'JUSTIFIED', needs_human_review: false,
    safety_result: { safe: true, safety_status: 'SAFE' }, protocol_compliance_result: { valid: true, compliance_status: 'COMPLIANT' } }
  const guarded = enforceDoseResult(old)
  assert.equal(guarded.final_verdict, 'NOT_JUSTIFIED')
  assert.equal(guarded.safety_result.safety_status, 'UNSAFE')
  assert.equal(guarded.needs_human_review, true)
  assert.equal(old.final_verdict, 'JUSTIFIED')
})

test('an excessive confirmation cannot open or submit any network request', async () => {
  const mod = { dosage_name: 'Apixaban', proposed_dosage: 10000, dosage_unit: 'mg', route: 'oral', frequency: 'twice daily' }
  assert.throws(() => preparePrescriptionConfirmation('Give Apixaban 10000 mg', { is_valid: true, modifications: [mod] }), /exceeds/)
  await assert.rejects(savePatientChange('', '/resume', { confirmed: true }, 'P010', 'Apixaban 10000 mg oral twice daily', () => assert.fail('Unsafe request reached network')), /exceeds/)
})

test('a backend without the numeric boundary update cannot receive prescriptions', async () => {
  let requests = 0
  await assert.rejects(savePatientChange('', '/resume', { confirmed: true }, 'P010', 'Apixaban 5 mg oral twice daily', async () => {
    requests++
    return Response.json({ confirmed_prescription_updates: true, persistence: 'supabase_verified' })
  }), /dose validation update/)
  assert.equal(requests, 1)
})
