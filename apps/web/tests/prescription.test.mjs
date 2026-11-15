import test from 'node:test'
import assert from 'node:assert/strict'
import { targetDose, matchesTargetDose, postDecision } from '../lib/prescription.ts'

test('selects the new dose, not the old dose or a lab concentration', () => {
  assert.deepEqual(targetDose('Reduce Apixaban from 40 mg to 5 mg oral twice daily'), {value:5,unit:'mg'})
  assert.deepEqual(targetDose('Creatinine 1.2 mg/dL; prescribe Apixaban 2.5 mg oral twice daily'), {value:2.5,unit:'mg'})
})
test('rejects missing, ambiguous and nonpositive targets', () => {
  for (const note of ['adjust Apixaban', 'Apixaban 5 mg or 10 mg', 'Apixaban 0 mg', 'Apixaban -5 mg']) assert.equal(targetDose(note),null)
})
test('server failures reject instead of reporting a successful modification', async () => {
  for (const status of [400,409,500]) {
    await assert.rejects(postDecision('/resume',{},async()=>new Response('',{status})),new RegExp(String(status)))
  }
  await assert.rejects(postDecision('/resume',{},async()=>{throw new Error('offline')}),/offline/)
})
test('sends the exact confirmed dosage once', async () => {
  let requests=[];const payload={prescribed_action:'Apixaban 2.5 mg oral once daily'}
  await postDecision('/resume',payload,async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return new Response('{}')})
  assert.deepEqual(requests,[{url:'/resume',body:payload}])
})
test('remote extraction must agree with the note and its structured dose', () => {
  const note = 'Reduce Apixaban from 40 mg to 5 mg oral twice daily'
  const modification = {proposed_dosage:5,dosage_unit:'mg'}
  assert.equal(matchesTargetDose(note,{modifications:[modification]}),true)
  assert.equal(matchesTargetDose(note,{modifications:[{...modification,proposed_dosage:40}]}),false)
  assert.equal(matchesTargetDose(note,{modifications:[{...modification,dosage_unit:'g'}]}),false)
  assert.equal(matchesTargetDose(note,{dosage:40,modifications:[modification]}),false)
  assert.equal(matchesTargetDose(note,{modifications:[modification,modification]}),false)
})
