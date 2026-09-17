"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DecisionGateway } from "@/components/decision-gateway"
import { ExecutionStream } from "@/components/execution-stream"
import { OrchestrationGraph } from "@/components/orchestration-graph"
import type { ArbitrationResult } from "@/app/actions"
import type { Patient } from "@/lib/clinical-data"

type Props = {
  patient: Patient
  protocol: string
  action: string
  onBack: () => void
  onDisqualifyPatient?: (patientId: string) => void
  onUpdatePatient?: (updatedPatient: Partial<Patient>) => void
}

export function AdjudicationConsole({
  patient,
  protocol,
  action,
  onBack,
  onDisqualifyPatient,
  onUpdatePatient,
}: Props) {
  const protocolId = protocol.split(" ")[0]

  const [streamKey, setStreamKey] = useState(0)
  const [arbitrationResult, setArbitrationResult] = useState<ArbitrationResult | null>(null)
  const [runStarted, setRunStarted] = useState(false)

  useEffect(() => {
    let cancelled = false
    setRunStarted(false)
    setArbitrationResult(null)

    fetch("http://localhost:8000/api/orchestrator/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: patient.id,
        prescribed_action: action,
        trial_id: protocolId,
        patient: {
          id: patient.id,
          patient_id: patient.id,
          name: patient.name,
          age: patient.age,
          sex: patient.sex,
          dob: patient.dob,
          cohort: patient.cohort,
          diagnosis: patient.diagnosis,
          creatinine: patient.creatinine,
          medications: patient.medications,
          clinical_data: patient.clinical_data,
        },
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to start orchestration run: ${response.status}`)
        if (!cancelled) setRunStarted(true)
      })
      .catch((error) => console.error("Failed to start orchestration run:", error))

    return () => {
      cancelled = true
    }
  }, [patient.id, action, protocolId])

  const handleRestartStream = () => {
    setArbitrationResult(null)
    setRunStarted(true)
    setStreamKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Top context header */}
      <header className="border-b border-[#2e2e2e] px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="border-[#2e2e2e] bg-[#1e1e1e] text-slate-300 hover:bg-[#2a2a2a] hover:text-white"
            >
              <ArrowLeft className="size-4" />
              Back to Patient Lookup
            </Button>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold">
                Adjudication Console{" "}
                <span className="text-slate-500">/ Human-In-the-Loop Review</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#2e2e2e] bg-[#1e1e1e] px-2.5 py-1 font-mono text-[11px] text-slate-300">
              PATIENT ID: {patient.id}
            </span>
            <span className="rounded-full border border-[#2e2e2e] bg-[#1e1e1e] px-2.5 py-1 font-mono text-[11px] text-slate-300">
              FDA PROTOCOL ID: {protocolId}
            </span>
            <span className="hidden rounded-full border border-[#2e2e2e] bg-[#1e1e1e] px-2.5 py-1 text-[11px] text-slate-300 md:inline">
              Site 04 · Massachusetts General
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#10b981]/30 bg-[#10b981]/10 px-3 py-1">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#10b981] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#10b981]" />
            </span>
            <span className="text-[11px] font-medium text-[#10b981]">
              Live Telemetry
            </span>
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-400">
          Adjudication Queue: {patient.cohort} · 1 of 7 pending review
        </p>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        {/* Full-width Expansive React Flow Block */}
        <OrchestrationGraph
          patientId={patient.id}
          patient={patient}
          action={action}
          restartSignal={streamKey}
          onArbitrationComplete={setArbitrationResult}
        />

        {!runStarted && !arbitrationResult && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-[#2e2e2e] bg-[#1e1e1e] p-6 text-sm text-slate-400">
            <Loader2 className="size-4 animate-spin text-[#3b82f6]" />
            Starting multi-agent clinical evaluation pipeline...
          </div>
        )}

        {arbitrationResult && (
          <DecisionGateway
            patient={patient}
            arbitrationResult={arbitrationResult}
            onRestartStream={handleRestartStream}
            onPatientUpdated={onUpdatePatient}
            onPatientDisqualified={(id) => {
              onDisqualifyPatient?.(id)
              onBack()
            }}
          />
        )}

        {/* Detailed Chronological Execution Stream */}
        <ExecutionStream patientId={patient.id} key={streamKey} />
      </main>
    </div>
  )
}
