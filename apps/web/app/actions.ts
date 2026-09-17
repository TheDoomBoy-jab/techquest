"use server"

import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

export async function getPatientsFromSupabase() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""

  if (!url || !key) {
    console.warn("Supabase credentials not configured in environment; returning empty patient list.")
    return []
  }

  const supabaseServer = createClient(url, key)
  const { data, error } = await supabaseServer.from("patients").select("*")
  if (error) {
    console.error("Error fetching patients from Supabase:", error)
    throw new Error(`Supabase query failed: ${error.message}`)
  }
  return data || []
}

export type ProtocolViolation = {
  name: string
  observed: string
  limit: string
  reference: string
  reason?: string
}

export type Guardrail1Result = {
  passed: boolean
  status: "PASSED" | "FAILED"
  missing_fields: string[]
  reason: string
  regulatory_citation: string
  action_required: string
}

export type Guardrail2Breach = {
  rule_id: string
  parameter: string
  observed: string
  limit: string
  difference: string
  severity: string
  reason: string
}

export type Guardrail2Result = {
  passed: boolean
  status: "PASSED" | "BREACHED"
  short_circuited: boolean
  breached_boundaries: Guardrail2Breach[]
  reason: string
  regulatory_citation: string
  action_required: string
}

export type RagRuleViolation = {
  rule_id: string
  parameter: string
  observed: string
  limit: string
  difference: string
  reference: string
  reason: string
}

export type RagRuleResult = {
  compliant: boolean
  status: "COMPLIANT" | "NON_COMPLIANT"
  violations: RagRuleViolation[]
  reason: string
}

export type AgentDiscrepancies = {
  has_discrepancy: boolean
  consensus_status: "UNANIMOUS_CONSENSUS_JUSTIFIED" | "CONSENSUS_REJECTED"
  dissenting_agents: string[]
  reasons: Record<string, string>
}

export type ArbitrationResult = {
  patientId: string
  recommendationTitle?: string
  recommendationSummary?: string
  protocolsViolated?: ProtocolViolation[]
  financialExposure?: number
  final_verdict?: "JUSTIFIED" | "NOT_JUSTIFIED" | "NEEDS_REVIEW"
  summary?: string
  prescribed_action?: string
  recent_action?: Record<string, string | null>
  protocol_compliance_result?: {
    compliance_status?: "COMPLIANT" | "NON_COMPLIANT" | "UNKNOWN"
    valid?: boolean
    violations?: Array<Record<string, unknown>>
    explanation?: string
    confidence?: number
  }
  safety_result?: {
    safety_status?: "SAFE" | "UNSAFE" | "NEEDS_REVIEW"
    safe?: boolean
    concerns?: Array<Record<string, unknown>>
    explanation?: string
    confidence?: number
  }
  financial_result?: {
    coverage_status?: "COVERED" | "NOT_COVERED" | "REQUIRES_PRE_AUTH"
    tier?: string
    pre_auth_required?: boolean
    sponsor_billing_eligible?: boolean
    financialExposure?: number
    explanation?: string
    callout?: string
    confidence?: number
  }
  agent_metrics?: Record<string, { latency_ms?: number; confidence?: number }>
  protocol_evidence?: Array<Record<string, unknown>>
  safety_evidence?: Array<Record<string, unknown>>
  iteration_count?: number
  needs_human_review?: boolean
  report_history?: Array<{
    iteration: number
    agent: string
    verdict: string
    status: string
    explanation?: string
    confidence?: number | string | null
    violations?: Array<Record<string, unknown>>
    concerns?: Array<Record<string, unknown>>
  }>
  modifications?: Array<Record<string, unknown>>
  guardrail_1_result?: Guardrail1Result
  guardrail_2_result?: Guardrail2Result
  rag_rule_result?: RagRuleResult
  agent_discrepancies?: AgentDiscrepancies
}

export async function getArbitrationResult(patientId: string): Promise<ArbitrationResult> {
  const response = await fetch(
    `http://localhost:8000/api/hitl/package/${encodeURIComponent(patientId)}`,
    { cache: "no-store" }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch arbitration result: ${response.status}`)
  }

  return response.json()
}

export async function processClinicalComment(comment: string) {
  const response = await fetch("http://localhost:8000/api/extract-comment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail || `Failed to process comment (${response.status})`
    );
  }

  return await response.json(); 
}

export async function submitDecision(
  patientId: string, 
  decision: "accept" | "reject" | "override", 
  justification?: string,
  modifications?: any[]
) {
    const payload = {
        patientId,
        decision,
        timestamp: new Date().toISOString(),
        justification: justification || null,
        modifications: modifications || []
    };
  

    const endpoint = decision === "override" 
      ? "http://localhost:8000/api/orchestrator/resume"     
      : "http://localhost:8000/api/orchestrator/checkpoint"; 

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      const detail = errBody?.detail || response.statusText || String(response.status);
      console.error(`Orchestrator ${endpoint} failed (${response.status}):`, detail);
      throw new Error(`Failed to signal orchestrator: ${response.status} (${detail})`);
    }

    if (decision === "override") {
      return { status: "restarting" };
    }
    return { status: "success", decision, patientId };
}