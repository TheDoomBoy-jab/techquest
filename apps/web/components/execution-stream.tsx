"use client"
import { CheckCircle2, Clock3, Info, Loader2 } from "lucide-react"
import { AGENTS, type AgentCard } from "@/lib/clinical-data"
import { useEffect, useState } from "react"
import { getGatewayUrl } from "@/lib/api-config"

type Props = {
  patientId: string
}
type AgentResult = {
  explanation?: string
  confidence?: number
}
type AgentView = Pick<AgentCard, "name"> & Partial<Omit<AgentCard, "name">> & {
  result?: AgentResult
  final_verdict?: string
}

export function ExecutionStream({ patientId }: Props) {
  const [agents, setAgents] = useState<AgentView[]>(() =>
    AGENTS.map(({ name }) => ({ name }))
  )
  const [connectionState, setConnectionState] = useState<"connecting" | "open" | "error">("connecting")

  useEffect(() => {
    setAgents(AGENTS.map(({ name }) => ({ name })))
    setConnectionState("connecting")

    const baseUrl = getGatewayUrl()
    const streamUrl = `${baseUrl}/api/orchestrator/stream?patientId=${encodeURIComponent(patientId)}`
    const eventSource = new EventSource(streamUrl)
    eventSource.onopen = () => setConnectionState("open")
    eventSource.onmessage = (event) => {
      try {
        const updatedAgent = JSON.parse(event.data)
        setAgents((prevAgents) => prevAgents.map((agent) => agent.name === updatedAgent.name ? { ...agent, ...updatedAgent } : agent))
        if (updatedAgent.name === "Arbitration Reducer" && updatedAgent.status === "completed") eventSource.close()
      } catch (error) { console.error("Failed to parse SSE data:", error) }
    }
    eventSource.onerror = () => {
      setConnectionState("error")
      try { eventSource.close() } catch {}
    }

    return () => {
      eventSource.close()
    }
  }, [patientId])


  return (
    <section className="rounded-xl border border-[#2e2e2e] bg-[#1e1e1e] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Execution Stream</h2>
          <p className="text-xs text-slate-400">4-stage agent audit pipeline</p>
        </div>
        <span className="rounded-full border border-[#2e2e2e] bg-[#121212] px-2.5 py-1 font-mono text-[11px] text-slate-300">
          RUN #A2F9-14
        </span>
      </div>

      <ol className="relative space-y-3">
        {agents.map((agent, i) => {
          const hasBackendState = Boolean(agent.status)
          const pending = agent.status === "pending"
          const processing = agent.status === "processing"
          return (
            <li
              key={agent.name}
              className={`relative rounded-lg border bg-[#121212] p-4 ${
                processing
                  ? "border-[#3b82f6]/60 ring-1 ring-[#3b82f6]/30"
                  : "border-[#2e2e2e]"
              }`}
            >
              <div className="flex items-start gap-3">
                {hasBackendState && (
                  <span className="mt-0.5 shrink-0">
                    {pending ? (
                      <Clock3 className="size-5 text-slate-500" />
                    ) : processing ? (
                      <Loader2 className="size-5 animate-spin text-[#3b82f6]" />
                    ) : (
                      <CheckCircle2 className="size-5 text-[#10b981]" />
                    )}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">
                      <span className="mr-1.5 font-mono text-xs text-slate-500">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {agent.name}
                    </p>
                    {hasBackendState && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          pending
                            ? "bg-slate-500/15 text-slate-400"
                            : processing
                              ? "bg-[#3b82f6]/15 text-[#3b82f6]"
                              : "bg-[#10b981]/15 text-[#10b981]"
                        }`}
                      >
                        {agent.status}
                      </span>
                    )}
                  </div>
                  {agent.description && (
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      {agent.description}
                    </p>
                  )}

                  {(agent.callout || agent.result?.explanation) && (
                    <div
                      className="mt-2.5 flex items-start gap-2 rounded-md border border-[#3b82f6]/30 bg-[#3b82f6]/10 px-2.5 py-2 text-xs leading-relaxed text-slate-200"
                    >
                      <Info className="mt-0.5 size-3.5 shrink-0 text-[#60a5fa]" />
                      <span>{agent.callout || agent.result?.explanation}</span>
                    </div>
                  )}

                  {agent.subtext && (
                    <p className="mt-2 font-mono text-[11px] text-[#3b82f6]/80">
                      {agent.subtext}
                    </p>
                  )}

                  {agent.latency && (
                    <div className="mt-2.5 flex items-center gap-3 font-mono text-[11px] text-slate-500">
                      <span>Latency {agent.latency}</span>
                      <span className="text-slate-700">·</span>
                      <span>Confidence {agent.confidence}</span>
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
