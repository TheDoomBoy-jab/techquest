"use client"

import { AlertDialog } from "@base-ui/react/alert-dialog"
import type { PrescriptionDraft } from "../lib/prescription"

type Props = {
  draft: PrescriptionDraft | null
  patientId: string
  patientName: string
  currentAction: string
  busy: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function PrescriptionConfirmation({ draft, patientId, patientName, currentAction, busy, error, onCancel, onConfirm }: Props) {
  const currentDrug = currentAction.match(/^(.+?)\s+\d/)?.[1]?.trim()
  const medicationChanged = Boolean(draft && currentDrug && currentDrug.toLowerCase() !== draft.drug.toLowerCase())
  return (
    <AlertDialog.Root open={Boolean(draft)} onOpenChange={(open) => { if (!open && !busy) onCancel() }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-[100] bg-black/75" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-[101] max-h-[90vh] w-[calc(100%_-_2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-600 bg-[#161616] p-6 text-white shadow-2xl">
          <AlertDialog.Title className="text-lg font-bold">Confirm prescription change</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-slate-300">
            Review the patient, doctor’s note and extracted order. Text extraction does not establish clinical safety or protocol compliance. Confirming saves the proposed order and starts re-evaluation.
          </AlertDialog.Description>
          {draft && <div className="mt-5 space-y-4 text-sm">
            <p><span className="text-slate-400">Patient:</span> {patientName} ({patientId})</p>
            <div className="rounded-lg border border-slate-700 p-3">
              <p className="text-xs font-semibold uppercase text-slate-400">Current order</p>
              <p className="mt-1">{currentAction}</p>
            </div>
            <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-3">
              <p className="text-xs font-semibold uppercase text-amber-300">Proposed order · review required</p>
              <p className="mt-1 font-semibold">{draft.action}</p>
              <p className="mt-2 text-xs text-slate-300">Dose: {draft.dose} {draft.unit} · Route: {draft.route} · Frequency: {draft.frequency}</p>
            </div>
            {medicationChanged && <p role="note" className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-3 text-amber-200">
              Medication switch: {currentDrug} → {draft.drug}. Check that the doctor intended to change the medication, rather than only its dose.
            </p>}
            <div>
              <p className="font-semibold text-slate-300">Doctor’s note</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-slate-400">{draft.note}</p>
            </div>
          </div>}
          {error && <p role="alert" className="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-sm text-rose-300">{error}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Close disabled={busy} className="rounded-lg border border-slate-600 px-4 py-2 text-sm disabled:opacity-50">Back to note</AlertDialog.Close>
            <button type="button" disabled={busy || !draft} onClick={onConfirm} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50">
              {busy ? "Saving and verifying…" : "Confirm and save"}
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
