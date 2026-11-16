"""Deterministic demo dose boundaries, independent of models and patient identifiers."""
from functools import lru_cache
import json
import math
from pathlib import Path
import re

POLICY_PATH = Path(__file__).resolve().parents[3] / "apps/web/lib/dose-policy.json"


class DosePolicyError(ValueError):
    pass


@lru_cache(maxsize=1)
def _policy():
    return json.loads(POLICY_PATH.read_text(encoding="utf-8"))


def check_dose_policy(action: str | dict) -> dict:
    unverified = {"status": "UNVERIFIED", "reason": "The drug, dose, units, route or frequency has no verified demo dose rule. Clinical review is required."}
    if isinstance(action, dict):
        action = f"{action.get('drug', '')} {action.get('dosage', '')} {action.get('route', '')} {action.get('frequency', '')}"
    if not isinstance(action, str):
        return unverified
    match = re.fullmatch(r"\s*([a-z][a-z -]*?)\s+((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)\s*(mg|mcg|ug|µg|g)\s+(oral|po|iv|intravenous)\s+(.+?)\s*", action, re.I)
    if not match:
        return unverified
    drug, amount, unit, route, frequency = match.groups()
    try:
        policy = _policy()
        profile = policy["drugs"].get(drug.strip().lower())
        if not profile:
            return unverified
        dose = float(amount.replace(",", "")) * {"mg": 1, "mcg": .001, "ug": .001, "µg": .001, "g": 1000}[unit.lower()]
        if not math.isfinite(dose) or dose <= 0:
            return unverified
        route = "IV" if route.lower() in ("iv", "intravenous") else "oral"
        frequency = " ".join(frequency.lower().split())
        frequency = {"bid": "twice daily", "twice a day": "twice daily", "q12h": "twice daily", "qd": "once daily", "daily": "once daily", "q24h": "once daily", "q3w": "every 3 weeks", "q6w": "every 6 weeks"}.get(frequency, frequency)
        regimen = next((r for r in profile["regimens"] if r["route"] == route and r["frequency"] == frequency), None)
        ceiling = regimen["max_mg"] if regimen else max(r["max_mg"] for r in profile["regimens"])
        result = {"drug": profile["name"], "dose_mg": dose, "max_mg": ceiling, "policy_version": policy["version"]}
        if dose > ceiling:
            return {**result, "status": "EXCEEDS_LIMIT", "reason": f"{profile['name']} {dose:g} mg exceeds the configured demo limit of {ceiling:g} mg per administration. The order is blocked."}
        if not regimen or dose not in regimen["allowed_mg"]:
            return {**unverified, **result}
        return {**result, "status": "WITHIN_LIMIT", "reason": "Within the configured demo dose boundary; patient-specific safety and protocol review are still required."}
    except (OSError, ValueError, KeyError, TypeError):
        return unverified


def require_dose_policy(action: str) -> dict:
    result = check_dose_policy(action)
    if result["status"] != "WITHIN_LIMIT":
        raise DosePolicyError(result["reason"])
    return result


def dose_policy_version():
    try:
        return _policy()["version"]
    except (OSError, ValueError, KeyError):
        return None


def enforce_specialist_dose(task: str, result: dict, action: str | dict) -> dict:
    dose = check_dose_policy(action)
    if dose["status"] == "WITHIN_LIMIT":
        return result
    rejected = dose["status"] == "EXCEEDS_LIMIT"
    common = {**result, "dose_policy_result": dose, "needs_human_review": True, "explanation": dose["reason"]}
    if task == "compliance":
        return {**common, "valid": False, "compliance_status": "NON_COMPLIANT" if rejected or result.get("compliance_status") == "NON_COMPLIANT" else "UNKNOWN", "violations": [*(result.get("violations") or []), {"parameter": "Dosage", "observed": str(action), "expected": f"<= {dose.get('max_mg')} mg" if rejected else "Verified dose rule", "protocol_text": "Configured demo formulary boundary", "reason": dose["reason"]}]}
    if task == "safety":
        return {**common, "safe": False, "safety_status": "UNSAFE" if rejected or result.get("safety_status") == "UNSAFE" else "NEEDS_REVIEW", "concerns": [*(result.get("concerns") or []), {"parameter": "Dosage", "reason": dose["reason"]}]}
    if task == "financial":
        return {**common, "coverage_status": "REQUIRES_PRE_AUTH", "pre_auth_required": True, "sponsor_billing_eligible": False, "callout": dose["reason"]}
    return result
