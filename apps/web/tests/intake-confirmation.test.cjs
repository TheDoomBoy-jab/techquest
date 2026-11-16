const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const Module = require('node:module')
const dom = require('./helpers/dom.cjs')
const { build } = require('esbuild')
const React = require('react')
const { createRoot } = require('react-dom/client')
const { act } = React

let IntakeView
test.before(async () => {
  const app = path.resolve(__dirname, '..')
  const output = await build({
    entryPoints: [path.join(app, 'components/intake-view.tsx')], absWorkingDir: app,
    bundle: true, packages: 'external', platform: 'node', format: 'cjs', jsx: 'automatic', write: false,
    plugins: [{ name: 'isolate-server-actions', setup(builder) {
      builder.onLoad({ filter: /[/\\]app[/\\]actions\.ts$/ }, () => ({
        contents: ['getPatientsFromSupabase', 'processClinicalComment', 'updateFhirDatabase'].map((name) =>
          `export async function ${name}(...args) { return globalThis.__intakeActions.${name}(...args) }`).join('\n'),
        loader: 'js',
      }))
    } }],
  })
  const compiled = new Module(path.join(app, 'intake-test-bundle.cjs'), module)
  compiled.filename = path.join(app, 'intake-test-bundle.cjs')
  compiled.paths = Module._nodeModulePaths(app)
  compiled._compile(output.outputFiles[0].text, compiled.filename)
  IntakeView = compiled.exports.IntakeView
})

async function render(saveResult = { success: true }) {
  const saves = [], submissions = []
  globalThis.__intakeActions = {
    async getPatientsFromSupabase() { return [{ patient_id: 'P044', name: 'Synthetic test patient',
      age: 45, sex: 'female', cohort: 'Cohort A', trial_id: 'NCT02415400',
      prescribed_action: 'Apixaban 10 mg oral twice daily',
      medications: ['Apixaban 10 mg oral twice daily'], clinical_data: {} }] },
    async processClinicalComment() { return { is_valid: true, is_appropriate: true,
      standardized_action: 'Apixaban 5 mg oral twice daily',
      standardized_drug: 'Apixaban', dosage: 5, dosage_unit: 'mg', route: 'oral', frequency: 'twice daily',
      modifications: [{ dosage_name: 'Apixaban', proposed_dosage: 5, dosage_unit: 'mg', route: 'oral', frequency: 'twice daily' }] } },
    async updateFhirDatabase(...args) { saves.push(args); return saveResult },
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(React.createElement(IntakeView, { onSubmit: (...args) => submissions.push(args) })))
  return { saves, submissions, async close() { await act(async () => root.unmount()); container.remove() } }
}

function button(label) {
  const buttons = [...document.querySelectorAll('button')]
  const found = buttons.find((b) => b.textContent.trim() === label) || buttons.find((b) => b.textContent.includes(label))
  assert.ok(found, `Missing button: ${label}`)
  return found
}

async function prepareChange() {
  const textarea = [...document.querySelectorAll('textarea')].find((el) => el.placeholder.startsWith('E.g., Apixaban'))
  assert.ok(textarea)
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'Reduce Apixaban from 10 mg to 5 mg oral twice daily')
    textarea.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  })
  await act(async () => button('Evaluate Note via Clinical LLM').click())
  assert.equal(button('Submit for AI Review').disabled, false, 'Review submission was disabled')
  await act(async () => button('Submit for AI Review').click())
  assert.ok(document.querySelector('[role="alertdialog"]'), document.body.textContent.slice(-800))
}

test('intake restores the saved order instead of the scenario preset', async () => {
  const view = await render()
  try {
    const action = [...document.querySelectorAll('textarea')].find((el) => el.placeholder.startsWith('E.g., Apixaban'))
    assert.equal(action.value, 'Apixaban 10 mg oral twice daily')
    assert.equal(view.saves.length, 0)
  } finally { await view.close() }
})

test('intake cancellation neither saves nor starts an evaluation', async () => {
  const view = await render()
  try {
    await prepareChange()
    assert.equal(view.saves.length, 0)
    assert.equal(view.submissions.length, 0)
    await act(async () => button('Back to note').click())
    assert.equal(view.saves.length, 0)
    assert.equal(view.submissions.length, 0)
  } finally { await view.close() }
})

test('intake database failure retains the note and blocks review submission', async () => {
  const view = await render({ success: false, error: 'Database unavailable; save not confirmed' })
  try {
    await prepareChange()
    await act(async () => button('Confirm and save').click())
    assert.equal(view.saves.length, 1)
    assert.equal(view.submissions.length, 0)
    assert.match(document.querySelector('[role="alert"]').textContent, /Database unavailable/)
    assert.match(document.querySelector('[role="alertdialog"]').textContent, /Reduce Apixaban from 10 mg to 5 mg/)
  } finally { await view.close() }
})

test('intake waits for confirmed persistence then submits the saved order once', async () => {
  const view = await render()
  try {
    await prepareChange()
    await act(async () => { const confirm = button('Confirm and save'); confirm.click(); confirm.click() })
    assert.equal(view.saves.length, 1)
    assert.equal(view.saves[0][2], true)
    assert.equal(view.saves[0][1].standardized_action, 'Apixaban 5 mg oral twice daily')
    assert.equal(view.submissions.length, 1)
    assert.equal(view.submissions[0][2], 'Apixaban 5 mg oral twice daily')
    assert.deepEqual(view.submissions[0][0].medications, ['Apixaban 5 mg oral twice daily'])
  } finally { await view.close() }
})
