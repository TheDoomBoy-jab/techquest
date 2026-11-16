const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const Module = require('node:module')
require('./helpers/dom.cjs')
const { buildSync } = require('esbuild')

const React = require('react')
const { createRoot } = require('react-dom/client')
const { act } = React
const app = path.resolve(__dirname, '..')
const output = buildSync({
  entryPoints: [path.join(app, 'components/prescription-confirmation.tsx')],
  absWorkingDir: app, bundle: true, packages: 'external', platform: 'node', format: 'cjs', jsx: 'automatic', write: false,
})
const compiled = new Module(path.join(app, 'confirmation-test-bundle.cjs'), module)
compiled.filename = path.join(app, 'confirmation-test-bundle.cjs')
compiled.paths = Module._nodeModulePaths(app)
compiled._compile(output.outputFiles[0].text, compiled.filename)
const { PrescriptionConfirmation } = compiled.exports

const draft = {
  note: 'Reduce Apixaban from 40 mg to 10 mg oral twice daily',
  action: 'Apixaban 10 mg oral twice daily', drug: 'Apixaban', dose: 10, unit: 'mg', route: 'oral', frequency: 'twice daily',
  modifications: [], extraction: {},
}

async function render(extra = {}) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const callbacks = { confirmed: 0, cancelled: 0 }
  const props = { draft, patientId: 'TEST', patientName: 'Synthetic test patient',
    currentAction: 'Apixaban 40 mg oral twice daily', busy: false, error: null,
    onConfirm: () => { callbacks.confirmed++ }, onCancel: () => { callbacks.cancelled++ }, ...extra }
  await act(async () => { root.render(React.createElement(PrescriptionConfirmation, props)) })
  return { callbacks, async close() { await act(async () => root.unmount()); container.remove() } }
}

test('opening a confirmation shows the exact change and performs no save', async () => {
  const view = await render()
  try {
    const dialog = document.querySelector('[role="alertdialog"]')
    assert.ok(dialog)
    for (const text of ['Synthetic test patient', 'TEST', 'Apixaban 40 mg', draft.action, draft.note]) assert.ok(dialog.textContent.includes(text), text)
    assert.equal(view.callbacks.confirmed, 0)
    const back = [...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Back to note')
    await act(async () => back.click())
    assert.equal(view.callbacks.cancelled, 1)
    assert.equal(view.callbacks.confirmed, 0)
  } finally { await view.close() }
})

test('the explicit confirm control is the only save callback', async () => {
  const view = await render()
  try {
    const confirm = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Confirm and save')
    await act(async () => confirm.click())
    assert.equal(view.callbacks.confirmed, 1)
  } finally { await view.close() }
})

test('saving disables both controls and prevents duplicate submission', async () => {
  const view = await render({ busy: true })
  try {
    const buttons = [...document.querySelector('[role="alertdialog"]').querySelectorAll('button')]
    assert.equal(buttons.length, 2)
    for (const button of buttons) {
      assert.equal(button.disabled, true)
      await act(async () => button.click())
    }
    assert.equal(view.callbacks.confirmed, 0)
    assert.equal(view.callbacks.cancelled, 0)
  } finally { await view.close() }
})

test('a database error keeps the doctor note visible and allows retry', async () => {
  const view = await render({ error: 'Database unavailable; save was not confirmed' })
  try {
    assert.match(document.querySelector('[role="alert"]').textContent, /Database unavailable/)
    assert.ok(document.querySelector('[role="alertdialog"]').textContent.includes(draft.note))
    const retry = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Confirm and save')
    assert.equal(retry.disabled, false)
    await act(async () => retry.click())
    assert.equal(view.callbacks.confirmed, 1)
  } finally { await view.close() }
})
