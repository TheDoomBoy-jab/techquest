"""Server-side persistence for finalized adjudication reports."""

from __future__ import annotations

import json
import copy
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

try:
    import httpx
except ImportError:
    httpx = None

logger = logging.getLogger(__name__)

# Resilient local persistent storage fallback
GATEWAY_DIR = Path(__file__).resolve().parents[1]
LOCAL_STORE_PATH = GATEWAY_DIR / "data" / "adjudication_reports.json"
LOCAL_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
_IN_MEMORY_REPORTS: dict[str, list[dict]] = {}


class ReportPersistenceError(RuntimeError):
    pass


class PatientPersistenceError(RuntimeError):
    def __init__(self, message: str, status_code: int = 503):
        super().__init__(message)
        self.status_code = status_code


def _load_env_if_missing() -> None:
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
        repo_env = GATEWAY_DIR.parent.parent / ".env"
        if repo_env.is_file():
            for line in repo_env.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k, v = k.strip(), v.strip().strip("'\"")
                    if k in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY") and not os.getenv(k):
                        os.environ[k] = v


def _config() -> tuple[str | None, str | None]:
    _load_env_if_missing()
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return (url.rstrip("/") if url else None, key)


def _headers(key: str, prefer: str = "return=representation") -> dict[str, str]:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": prefer,
    }


def _load_local_reports() -> dict[str, list[dict]]:
    global _IN_MEMORY_REPORTS
    if not _IN_MEMORY_REPORTS and LOCAL_STORE_PATH.is_file():
        try:
            _IN_MEMORY_REPORTS = json.loads(LOCAL_STORE_PATH.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.warning("Failed to load local reports store: %s", exc)
            _IN_MEMORY_REPORTS = {}
    return _IN_MEMORY_REPORTS


def _save_local_report(patient_id: str, report: dict) -> None:
    store = _load_local_reports()
    clean_id = patient_id.strip()
    if clean_id not in store:
        store[clean_id] = []
    store[clean_id].append(report)
    try:
        LOCAL_STORE_PATH.write_text(json.dumps(store, indent=2), encoding="utf-8")
    except Exception as exc:
        logger.warning("Failed to write to local reports store: %s", exc)


def append_final_report(patient_id: str, report: dict) -> dict:
    finalized_report = {
        "report_id": str(uuid4()),
        "saved_at": datetime.now(timezone.utc).isoformat(),
        **report,
    }

    # 1. Always save locally first so the report is NEVER lost
    _save_local_report(patient_id, finalized_report)

    # 2. Attempt remote Supabase synchronization
    url, key = _config()
    if not url or not key or not httpx:
        logger.info("Saved report for %s locally (Supabase credentials not configured)", patient_id)
        return finalized_report

    headers = _headers(key)
    base = f"{url}/rest/v1/patients"

    try:
        with httpx.Client(timeout=10) as client:
            # Report appends share the patient's version so they cannot overwrite
            # a prescription saved between this read and write. Retry conflicts.
            for column in ("clinical_data", "adjudication_reports"):
                for _ in range(3):
                    response = client.get(base, headers=headers, params={
                        "patient_id": f"eq.{patient_id}",
                        "select": f"patient_id,{column},updated_at",
                    })
                    if response.status_code != 200:
                        break
                    rows = response.json()
                    if not isinstance(rows, list) or len(rows) != 1:
                        break
                    previous = rows[0]
                    value = copy.deepcopy(previous.get(column))
                    if column == "clinical_data":
                        value = value if isinstance(value, dict) else {}
                        existing = value.get("adjudication_reports") or []
                    else:
                        existing = value or []
                    existing = existing if isinstance(existing, list) else []
                    reports = [*existing, finalized_report]
                    if column == "clinical_data":
                        value["adjudication_reports"] = reports
                    else:
                        value = reports
                    version = previous.get("updated_at")
                    saved = client.patch(base, headers=headers, params={
                        "patient_id": f"eq.{patient_id}",
                        "updated_at": f"eq.{version}" if version is not None else "is.null",
                    }, json={column: value, "updated_at": datetime.now(timezone.utc).isoformat()})
                    if saved.status_code != 200:
                        break
                    saved_rows = saved.json()
                    if isinstance(saved_rows, list) and len(saved_rows) == 1:
                        logger.info("Report for %s synced to Supabase", patient_id)
                        return finalized_report
    except Exception as exc:
        logger.warning("Remote Supabase report sync encountered error (local copy preserved): %s", exc)

    return finalized_report


def get_final_reports(patient_id: str) -> list[dict]:
    # 1. Fetch from local store
    local_store = _load_local_reports()
    local_reports = local_store.get(patient_id.strip(), [])

    # 2. Attempt fetch from Supabase
    url, key = _config()
    remote_reports: list[dict] = []
    if url and key:
        headers = _headers(key, prefer="return=minimal")
        base = f"{url}/rest/v1/patients"
        try:
            with httpx.Client(timeout=8) as client:
                # Check clinical_data first
                resp = client.get(
                    base,
                    params={"patient_id": f"eq.{patient_id}", "select": "patient_id,clinical_data"},
                    headers=headers,
                )
                if resp.status_code == 200:
                    rows = resp.json()
                    if rows:
                        cdata = rows[0].get("clinical_data") or {}
                        remote_reports = cdata.get("adjudication_reports") or []
                elif resp.status_code != 200:
                    # Fallback to direct column
                    resp_direct = client.get(
                        base,
                        params={"patient_id": f"eq.{patient_id}", "select": "patient_id,adjudication_reports"},
                        headers=headers,
                    )
                    if resp_direct.status_code == 200:
                        rows = resp_direct.json()
                        if rows:
                            remote_reports = rows[0].get("adjudication_reports") or []
        except Exception as exc:
            logger.warning("Failed querying Supabase for reports: %s", exc)

    # 3. Merge and deduplicate by report_id
    seen_ids = set()
    combined: list[dict] = []
    for r in (*remote_reports, *local_reports):
        rid = r.get("report_id") or r.get("saved_at")
        if rid and rid not in seen_ids:
            seen_ids.add(rid)
            combined.append(r)
        elif not rid:
            combined.append(r)

    return combined


def load_persisted_patients() -> list[dict]:
    """Hydrate saved fields on restart; fixtures remain available for read-only demos."""
    url, key = _config()
    if not url or not key or not httpx:
        return []
    try:
        with httpx.Client(timeout=8) as client:
            response = client.get(f"{url}/rest/v1/patients", headers=_headers(key), params={
                "select": "patient_id,prescribed_action,clinical_data,age,sex",
            })
            response.raise_for_status()
            rows = response.json()
            return rows if isinstance(rows, list) else []
    except Exception:
        logger.warning("Database unavailable while loading saved patients; local read-only fixtures remain available")
        return []


def sync_patient_data_to_supabase(patient_id: str, updates: dict) -> dict:
    """Save to Supabase and verify the returned row. Never report a cache-only save."""
    url, key = _config()
    if not url or not key or not httpx:
        raise PatientPersistenceError("Database saving is not configured. The change was not saved.")

    clean_id = patient_id.strip()
    headers = _headers(key)
    base = f"{url}/rest/v1/patients"

    try:
        with httpx.Client(timeout=8) as client:
            response = client.get(base, headers=headers, params={
                "patient_id": f"eq.{clean_id}",
                "select": "patient_id,prescribed_action,clinical_data,updated_at",
            })
            response.raise_for_status()
            rows = response.json()
            if not isinstance(rows, list) or len(rows) != 1 or rows[0].get("patient_id") != clean_id:
                raise PatientPersistenceError("Patient was not found in the database. The change was not saved.", 404)
            previous = rows[0]
            cdata = copy.deepcopy(previous.get("clinical_data") or {})
            if not isinstance(cdata, dict):
                raise PatientPersistenceError("The stored patient record is invalid. The change was not saved.")
            patch_payload = {"updated_at": datetime.now(timezone.utc).isoformat()}
            clinical_changes = copy.deepcopy(updates.get("clinical_data") or {})
            for field in ("age", "sex", "prescribed_action", "medications", "dosage_instructions"):
                if field in updates and updates[field] is not None:
                    value = copy.deepcopy(updates[field])
                    if field == "sex":
                        value = str(value).lower()
                        value = "female" if value.startswith("f") else "male" if value.startswith("m") else value
                    clinical_changes[field] = value
                    if field in ("age", "sex", "prescribed_action"):
                        patch_payload[field] = value
            cdata.update(clinical_changes)
            patch_payload["clinical_data"] = cdata
            version = previous.get("updated_at")
            saved = client.patch(base, headers=headers, params={
                "patient_id": f"eq.{clean_id}",
                "updated_at": f"eq.{version}" if version is not None else "is.null",
                "select": "patient_id,prescribed_action,clinical_data,updated_at,age,sex",
            }, json=patch_payload)
            saved.raise_for_status()
            # A 200 with [] or 204 can mean no row was updated. Require evidence.
            if saved.status_code != 200:
                raise PatientPersistenceError("The database did not confirm the save. Reload the record before retrying.")
            saved_rows = saved.json()
            if not isinstance(saved_rows, list) or len(saved_rows) != 1:
                raise PatientPersistenceError("The patient record changed or the update was not allowed. Reload and retry.", 409)
            row = saved_rows[0]
            if row.get("patient_id") != clean_id or not row.get("updated_at"):
                raise PatientPersistenceError("The database returned an invalid save confirmation.")
            actual_clinical = row.get("clinical_data") or {}
            if not isinstance(actual_clinical, dict) or any(actual_clinical.get(k) != v for k, v in clinical_changes.items()):
                raise PatientPersistenceError("The saved patient values could not be verified. Reload before retrying.")
            if any(row.get(k) != v for k, v in patch_payload.items() if k not in ("updated_at", "clinical_data")):
                raise PatientPersistenceError("The saved prescription could not be verified. Reload before retrying.")
            return {"storage": "supabase", "verified": True, "patient_id": clean_id,
                    "prescribed_action": row.get("prescribed_action"), "updated_at": row["updated_at"]}
    except PatientPersistenceError:
        raise
    except Exception as exc:
        logger.warning("Database patient save could not be confirmed (%s)", type(exc).__name__)
        raise PatientPersistenceError("Could not reach or verify the database. Your change was not confirmed; please retry.") from exc
