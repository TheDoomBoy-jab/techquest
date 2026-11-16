import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesPrescriptionAction } from '../lib/prescription.ts'

const expected = 'Apixaban 10 mg oral twice daily'
// Exact prescription string returned by the deployed P044 package in the report.
const legacy = `${expected} (Clinician modification: Apixaban set to 10 mg)`

test('loads the completed legacy prescription shown in the screenshot', () => {
  assert.notEqual(legacy.trim().toLowerCase(), expected.trim().toLowerCase())
  assert.equal(matchesPrescriptionAction(legacy, expected), true)
  assert.equal(matchesPrescriptionAction(expected, expected), true)
})

test('accepts case, whitespace and repeated legacy audit suffixes', () => {
  assert.equal(matchesPrescriptionAction(`  APIXABAN 10 mg  oral twice daily\n`, expected), true)
  assert.equal(matchesPrescriptionAction(`${legacy} (Clinician modification: Apixaban set to 10 mg)`, expected), true)
})

test('does not accept a different dose, unit, route or frequency', () => {
  for (const order of [
    'Apixaban 5 mg oral twice daily',
    'Apixaban 10 mcg oral twice daily',
    'Apixaban 10 mg IV twice daily',
    'Apixaban 10 mg oral once daily',
    'Empagliflozin 10 mg oral twice daily',
  ]) assert.equal(matchesPrescriptionAction(`${order} (Clinician modification: Apixaban set to 10 mg)`, expected), false)
})

test('does not strip unknown clinical qualifiers or embedded annotations', () => {
  assert.equal(matchesPrescriptionAction(`${expected} (hold if bleeding)`, expected), false)
  assert.equal(matchesPrescriptionAction(`${legacy} every 3 weeks`, expected), false)
})

test('does not accept missing prescription data', () => {
  for (const value of [null, undefined, {}, '', '(Clinician modification: Apixaban set to 10 mg)']) {
    assert.equal(matchesPrescriptionAction(value, expected), false)
  }
  assert.equal(matchesPrescriptionAction('', ''), false)
})
