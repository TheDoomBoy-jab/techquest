import test from 'node:test'
import assert from 'node:assert/strict'
import { preparePrescriptionConfirmation, savePatientChange } from '../lib/prescription.ts'

function extraction() {
  return { is_valid: true, is_appropriate: true, modifications: [{
    dosage_name: 'Apixaban', proposed_dosage: 10, dosage_unit: 'mg', route: 'oral', frequency: 'twice daily',
  }] }
}
const action = 'Apixaban 10 mg oral twice daily'
const support = { confirmed_prescription_updates: true, persistence: 'supabase_verified' }
const saved = { status: 'success', patientId: 'TEST', prescribed_action: action, persistence: {
  storage: 'supabase', verified: true, patient_id: 'TEST', prescribed_action: action, updated_at: '2026-11-16T00:00:00Z',
} }

test('confirmation snapshots the exact note and complete extracted order', () => {
  const original = extraction()
  const draft = preparePrescriptionConfirmation('Give Apixaban 10 mg oral twice daily', original)
  original.modifications[0].proposed_dosage = 5
  assert.equal(draft.action, action)
  assert.equal(draft.modifications[0].proposed_dosage, 10)
  assert.equal(draft.note, 'Give Apixaban 10 mg oral twice daily')
})

test('confirmation rejects incomplete or invalid data without inventing defaults', () => {
  assert.throws(() => preparePrescriptionConfirmation('', extraction()))
  for (const field of ['dosage_name', 'dosage_unit', 'route', 'frequency']) {
    const data = extraction(); delete data.modifications[0][field]
    assert.throws(() => preparePrescriptionConfirmation('Doctor note', data))
  }
  for (const dose of [0, -5, Infinity, NaN, true]) {
    const data = extraction();data.modifications[0].proposed_dosage = dose
    assert.throws(() => preparePrescriptionConfirmation('Doctor note', data))
  }
})

test('an unconfirmed request performs no network operations', async () => {
  await assert.rejects(savePatientChange('', '/resume', {}, 'TEST', action, async () => {
    assert.fail('Unconfirmed request reached the gateway')
  }), /Confirm/)
})

test('old gateways are checked before any modification is submitted', async () => {
  for (const capability of [new Response('', {status:404}), Response.json({})]) {
    let calls=0
    await assert.rejects(savePatientChange('', '/resume', {confirmed:true}, 'TEST', action, async (url, options) => {
      calls++;assert.equal(url,'/api/orchestrator/capabilities');assert.equal(options.method,undefined)
      return capability
    }))
    assert.equal(calls,1)
  }
})

test('a successful HTTP response without matching database proof is rejected', async () => {
  const invalid = [
    {status:'success',patientId:'TEST'},
    {...saved,persistence:{...saved.persistence,verified:false}},
    {...saved,persistence:{...saved.persistence,storage:'memory'}},
    {...saved,persistence:{...saved.persistence,patient_id:'OTHER'}},
    {...saved,persistence:{...saved.persistence,prescribed_action:'Apixaban 5 mg oral twice daily'}},
    {...saved,persistence:{...saved.persistence,updated_at:'not-a-timestamp'}},
  ]
  for (const response of invalid) {
    await assert.rejects(savePatientChange('', '/resume', {confirmed:true}, 'TEST', action,
      async (url) => Response.json(url.endsWith('/capabilities') ? support : response)), /could not be verified/)
  }
})

test('database errors are surfaced and never become a successful receipt', async () => {
  await assert.rejects(savePatientChange('', '/resume', {confirmed:true}, 'TEST', action,
    async (url) => url.endsWith('/capabilities') ? Response.json(support)
      : Response.json({detail:'Database is unavailable; the change was not saved'},{status:503})), /Database is unavailable/)
})

test('a verified save submits the confirmed snapshot once', async () => {
  const draft=preparePrescriptionConfirmation('Give Apixaban 10 mg oral twice daily',extraction())
  const payload={patientId:'TEST',confirmed:true,justification:draft.note,modifications:draft.modifications}
  const calls=[]
  const result=await savePatientChange('', '/resume', payload, 'TEST', action, async(url,options)=>{
    calls.push({url,options})
    return Response.json(url.endsWith('/capabilities')?support:saved)
  })
  assert.equal(result.persistence.verified,true)
  assert.equal(calls.length,2)
  assert.equal(calls[1].options.method,'POST')
  assert.deepEqual(JSON.parse(calls[1].options.body),payload)
})
