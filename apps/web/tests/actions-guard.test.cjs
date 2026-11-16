const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const Module = require('node:module')
const { build } = require('esbuild')
let actions
const originalFetch = globalThis.fetch

test.before(async () => {
  const app = path.resolve(__dirname, '..')
  const output = await build({ entryPoints: [path.join(app, 'app/actions.ts')], absWorkingDir: app,
    bundle: true, packages: 'external', platform: 'node', format: 'cjs', write: false })
  const compiled = new Module(path.join(app, 'actions-test-bundle.cjs'), module)
  compiled.filename = path.join(app, 'actions-test-bundle.cjs')
  compiled.paths = Module._nodeModulePaths(app)
  compiled._compile(output.outputFiles[0].text, compiled.filename)
  actions = compiled.exports
})
test.afterEach(() => { globalThis.fetch = originalFetch })

const unsafePackage = { patientId: 'P010', prescribed_action: 'Apixaban 100000 mg oral twice daily',
  final_verdict: 'JUSTIFIED', safety_result: { safety_status: 'SAFE' }, protocol_compliance_result: { compliance_status: 'COMPLIANT' } }

test('the real result action rejects a legacy optimistic overdose verdict', async () => {
  globalThis.fetch = async () => Response.json(unsafePackage)
  const result = await actions.getArbitrationResult('P010')
  assert.equal(result.final_verdict, 'NOT_JUSTIFIED')
  assert.equal(result.safety_result.safety_status, 'UNSAFE')
})

test('the real result action never invents a verdict when the gateway is unavailable', async () => {
  globalThis.fetch = async () => new Response('', { status: 503 })
  await assert.rejects(actions.getArbitrationResult('P010'), /evaluation is unavailable/)
})

test('remote and fallback note extraction both reject the reported quantity', async () => {
  const mod = { dosage_name: 'Apixaban', proposed_dosage: 10000, dosage_unit: 'mg', route: 'oral', frequency: 'twice daily' }
  globalThis.fetch = async () => Response.json({ is_valid: true, is_appropriate: true, modifications: [mod] })
  const remote = await actions.processClinicalComment('Titrate Apixaban to 10000 mg oral twice daily')
  assert.equal(remote.is_valid, false)
  globalThis.fetch = async () => new Response('', { status: 503 })
  const fallback = await actions.processClinicalComment('Titrate Apixaban to 10000 mg oral twice daily')
  assert.equal(fallback.is_valid, false)
})

test('the real acceptance action cannot post the legacy unsafe package', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => { calls.push(options?.method || 'GET'); return Response.json(unsafePackage) }
  const result = await actions.submitDecision('P010', 'accept')
  assert.equal(result.status, 'error')
  assert.deepEqual(calls, ['GET'])
})

test('the real update action cannot bypass the local dose gate', async () => {
  globalThis.fetch = () => assert.fail('Unsafe prescription reached network')
  const result = await actions.updateFhirDatabase('P010', { standardized_action: 'Apixaban 10000 mg oral twice daily',
    standardized_drug: 'Apixaban', dosage: 10000, dosage_unit: 'mg', route: 'oral', frequency: 'twice daily', timing_schedule: '' }, true)
  assert.equal(result.success, false)
})

test('fallback extraction preserves the configured six-week biologic interval', async () => {
  globalThis.fetch = async () => new Response('', { status: 503 })
  const result = await actions.processClinicalComment('Change Pembrolizumab to 400 mg IV every 6 weeks')
  assert.equal(result.is_valid, true)
  assert.equal(result.frequency, 'every 6 weeks')
})
