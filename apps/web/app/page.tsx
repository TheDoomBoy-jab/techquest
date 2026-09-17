"use client"

import { useState } from "react"
import { AdjudicationConsole } from "components/adjudication-console"
import { IntakeView } from "@/components/intake-view"
import { PROTOCOLS, type Patient } from "@/lib/clinical-data"
import type { Patient as IntakePatient } from "@/components/intake-view"

type View = "intake" | "adjudication"

export default function Page() {
  const [view, setView] = useState<View>("intake")
  const [patient, setPatient] = useState<Patient | null>(null)
  const [protocol, setProtocol] = useState<string>(PROTOCOLS[0])
  const [action, setAction] = useState("")

  function handleSubmit(p: IntakePatient, proto: string, proposedAction: string) {
    setPatient({
      id: p.patient_id,
      name: p.name,
      dob: p.dob,
      age: p.age,
      sex: p.sex === "F" ? "F" : "M",
      cohort: p.cohort,
      diagnosis: p.diagnosis,
      creatinine: (p.creatinine && p.creatinine !== "unknown") ? p.creatinine : "CrCl 55 mL/min",
      trial_id: p.trial_id,
      medications: p.medications,
      clinical_data: p.clinical_data,
      report_history: p.report_history,
    })
    setProtocol(proto)
    setAction(proposedAction)
    setView("adjudication")
  }

  if (view === "adjudication" && patient) {
    return (
      <AdjudicationConsole
        patient={patient}
        protocol={protocol}
          action={action}
        onBack={() => setView("intake")}
      />
    )
  }

  return <IntakeView onSubmit={handleSubmit} />
}
