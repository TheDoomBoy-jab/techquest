type Report = {
    report_id?: string
    saved_at?: string
    patient_id: string
    trial_id?: string
    final_decision?: string
    decision_timestamp?: string
    final_verdict?: string
    summary?: string
    original_prescribed_action?: string
    final_prescribed_action?: string
    clinician_justification?: string | null
    protocol_compliance_result?: Record<string, unknown>
    safety_result?: Record<string, unknown>
    financial_result?: Record<string, unknown>
    protocol_evidence?: Array<Record<string, unknown>>
    safety_evidence?: Array<Record<string, unknown>>
    report_history?: Array<Record<string, unknown>>
    agent_metrics?: Record<string, Record<string, unknown>>
    iteration_count?: number
}

export default async function ReportPage({ params }: { params: Promise<{ patientId: string }> }) {
    const { patientId } = await params
    const response = await fetch(`http://localhost:8000/api/reports/${encodeURIComponent(patientId)}`, { cache: "no-store" })
    const payload = response.ok ? await response.json() : { reports: [] }
    const report = (payload.reports ?? []).at(-1) as Report | undefined

    return (
        <main className="min-h-screen bg-[#121212] px-4 py-8 text-white md:px-8">
            <div className="mx-auto max-w-6xl space-y-5">
                <header className="rounded-xl border border-[#2e2e2e] bg-[#1e1e1e] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60a5fa]">TrialGuard / Regulatory Final Report</p>
                        <a href="/" className="text-xs text-slate-400 hover:text-white transition-colors">
                            &larr; Back to Adjudication Console
                        </a>
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-semibold">Adjudication Report</h1>
                            <p className="mt-1 font-mono text-sm text-slate-400">Patient {patientId} · Trial {report?.trial_id ?? "Not available"}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <StatusBadge value={report?.final_verdict ?? "REPORT_UNAVAILABLE"} />
                            <a
                                href={`http://localhost:8000/api/reports/${encodeURIComponent(patientId)}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md transition-all"
                            >
                                Download Official PDF (21 CFR Part 11)
                            </a>
                        </div>
                    </div>
                </header>

                {!report ? (
                    <section className="rounded-xl border border-[#f59e0b]/30 bg-[#1e1e1e] p-6 text-sm text-slate-300">
                        No finalized report is available. An Accept or Reject decision must be recorded first.
                    </section>
                ) : (
                    <>
                        <section className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
                            <ReportSection title="Arbitration Summary">
                                <p className="text-base leading-7 text-slate-200">{report.summary ?? "No summary was returned."}</p>
                            </ReportSection>
                            <ReportSection title="Decision Record">
                                <Detail label="Decision" value={report.final_decision} />
                                <Detail label="Timestamp" value={report.decision_timestamp} />
                                <Detail label="Iteration" value={String(report.iteration_count ?? 0)} />
                            </ReportSection>
                        </section>

                        <section className="grid gap-5 md:grid-cols-2">
                            <ReportSection title="Prescribed Action">
                                <Detail label="Original" value={report.original_prescribed_action} />
                                <Detail label="Final" value={report.final_prescribed_action} />
                                <Detail label="Clinician justification" value={report.clinician_justification ?? "None provided"} />
                            </ReportSection>
                            <ReportSection title="Financial Risk Agent">
                                <JsonList data={report.financial_result} />
                            </ReportSection>
                        </section>

                        <section className="grid gap-5 md:grid-cols-2">
                            <AgentReport title="Protocol Compliance Agent" data={report.protocol_compliance_result} />
                            <AgentReport title="Safety & Toxicity Agent" data={report.safety_result} />
                        </section>

                        <section className="grid gap-5 md:grid-cols-2">
                            <ReportSection title="Protocol Evidence"><JsonList data={report.protocol_evidence} /></ReportSection>
                            <ReportSection title="Safety Evidence"><JsonList data={report.safety_evidence} /></ReportSection>
                        </section>

                        <ReportSection title="Agent Metrics"><JsonList data={report.agent_metrics} /></ReportSection>
                        <ReportSection title="Refinement History"><JsonList data={report.report_history} /></ReportSection>
                    </>
                )}
            </div>
        </main>
    )
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
    return <section className="rounded-xl border border-[#2e2e2e] bg-[#1e1e1e] p-5"><h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2><div className="space-y-3">{children}</div></section>
}

function AgentReport({ title, data }: { title: string; data?: Record<string, unknown> }) {
    return <ReportSection title={title}><StatusBadge value={String(data?.compliance_status ?? data?.safety_status ?? "UNKNOWN")} /><Detail label="Explanation" value={String(data?.explanation ?? "No explanation was returned.")} /><JsonList data={data?.violations ?? data?.concerns ?? data?.evidence} /></ReportSection>
}

function Detail({ label, value }: { label: string; value?: string }) {
    return <div><p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words text-sm leading-6 text-slate-200">{value ?? "Not available"}</p></div>
}

function StatusBadge({ value }: { value: string }) {
    return <span className="inline-flex rounded-full border border-[#3b82f6]/40 bg-[#3b82f6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#93c5fd]">{value.replaceAll("_", " ")}</span>
}

function JsonList({ data }: { data: unknown }) {
    if (!data || (Array.isArray(data) && data.length === 0)) return <p className="text-sm text-slate-500">None reported.</p>
    return <pre className="max-h-96 overflow-auto rounded-lg border border-[#2e2e2e] bg-[#121212] p-3 text-xs leading-6 text-slate-300">{JSON.stringify(data, null, 2)}</pre>
}