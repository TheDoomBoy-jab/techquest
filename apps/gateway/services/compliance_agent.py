"""Protocol compliance specialist used behind the A2A adapter."""

from __future__ import annotations

import json
from typing import Any

from .llm_client import call_llm, parse_json_response
from .dose_policy import check_dose_policy, enforce_specialist_dose


def evaluate(
    trial_id: str,
    recent_action: dict,
    protocol_chunks: list[dict],
    report_history: list[dict],
    modification: str = "",
) -> dict:
    prompt = f"""You are the TrialGuard Protocol Compliance Agent.
Evaluate ONLY whether the recent action complies with the supplied protocol.
Do not use or invent patient information. Return ONLY valid JSON with exactly:
{{"valid": true, "compliance_status": "COMPLIANT", "violations": [],
"sources": [], "needs_human_review": false, "explanation": "...",
"numeric_comparison": {{"applicable": false, "observed_value": null, "boundary_value": null}}}}
Allowed statuses are COMPLIANT, NON_COMPLIANT, UNKNOWN. UNKNOWN means required
protocol or action information is missing. Every violation must contain parameter,
observed, expected, protocol_text, and reason. expected must contain operator, value,
and unit. Do not include confidence; it is calculated here.

TRIAL ID: {trial_id}
RECENT ACTION: {json.dumps(recent_action, indent=2)}
MODIFICATION: {modification or '(none)'}
RELEVANT PROTOCOLS: {json.dumps(protocol_chunks, indent=2)}
REPORT HISTORY: {json.dumps(report_history, indent=2)}"""
    dose_check = check_dose_policy(recent_action)
    if dose_check["status"] != "WITHIN_LIMIT":
        return enforce_specialist_dose("compliance", {}, recent_action)
    source_title = f"ClinicalTrials.gov Protocol {trial_id}"
    protocol_text_ref = (
        protocol_chunks[0].get("text")
        if protocol_chunks and isinstance(protocol_chunks[0], dict) and protocol_chunks[0].get("text")
        else f"Protocol {trial_id} Standard Investigational Dosing Criteria."
    )

    try:
        result = parse_json_response(call_llm(prompt, max_tokens=600))
    except Exception:
        return {
            "trial_id": trial_id,
            "valid": False,
            "compliance_status": "UNKNOWN",
            "violations": [],
            "sources": [source_title],
            "needs_human_review": True,
            "explanation": "Protocol review was unavailable. A dose boundary check alone does not establish compliance.",
            "confidence": 0.0,
        }

    status = str(result.get("compliance_status", "UNKNOWN")).upper()
    violations = result.get("violations", [])
    if not isinstance(violations, list):
        violations = [violations] if violations else []

    sources = result.get("sources", [])
    if not isinstance(sources, list) or not sources:
        sources = [source_title]

    if status not in {"COMPLIANT", "NON_COMPLIANT", "UNKNOWN"}:
        status = "UNKNOWN"
    explanation = str(result.get("explanation") or f"Intervention complies with protocol {trial_id} standard criteria.")

    result["trial_id"] = str(result.get("trial_id") or trial_id)
    result["valid"] = status == "COMPLIANT"
    result["compliance_status"] = status
    result["violations"] = violations
    result["sources"] = sources
    result["needs_human_review"] = status != "COMPLIANT"
    result["explanation"] = explanation
    result["confidence"] = _confidence(status, result.get("numeric_comparison"))
    result.pop("numeric_comparison", None)
    return result


def _confidence(status: str, comparison: Any) -> float:
    if status == "UNKNOWN":
        return 0.30
    if not isinstance(comparison, dict) or not comparison.get("applicable"):
        return 0.90
    observed = comparison.get("observed_value")
    boundary = comparison.get("boundary_value")
    if not isinstance(observed, (int, float)) or not isinstance(boundary, (int, float)):
        return 0.90
    return 0.95 if observed != boundary else 0.65
