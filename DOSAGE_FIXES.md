# Doctor-note modification regression fixes

Verified locally on 2026-11-16. The completed-stream result-loading fix was also verified against the deployed response. The confirmation and verified-persistence changes below require an updated gateway and a reachable Supabase project; a live database write has not been verified.

## Fixed behavior

- A note such as “reduce Apixaban from 40 mg to 5 mg” selects the target 5 mg. Both fallback parsers require an identifiable medication and explicit positive dose with units. Lab concentrations such as mg/dL do not become prescription quantities.
- Remote model extraction is checked against the note's explicit target. A model returning the old dose is rejected in favor of deterministic extraction; the displayed action is rebuilt from the structured prescription.
- “Give” no longer accidentally matches the IV route. Complete structured modifications preserve the drug, dose, unit, route and frequency when passed to the coordinator.
- The resume operation saves once, reloads the updated patient medication list, and evaluates that input. Medication storage keeps the full order, including IV cycle frequencies. Partial patient IDs cannot update a different patient's record.
- Re-evaluation preserves the original order and report history across successive modifications. Restarting the stream no longer starts a second initial evaluation that discards this history.
- Failed HTTP requests no longer become successful modifications in the UI. The note and extracted prescription remain available for retry; editing the note invalidates previous extraction, including late responses.
- Result loading checks the requested prescription. Stream failures show an error and retry control instead of invented completion cards, confidence values and timings. Retrying reconnects to the existing run.

## Completed-stream result loading follow-up

The deployed P044 demo exposed a compatibility mismatch after modification. Its package returned `Apixaban 10 mg oral twice daily (Clinician modification: Apixaban set to 10 mg)`, while the UI requested `Apixaban 10 mg oral twice daily`. The previous exact-string comparison rejected the completed result, leaving all agent cards completed but the review panel stuck loading.

The comparator now ignores only the known trailing `Clinician modification` audit annotation and normalizes case/whitespace. It still rejects different drugs, doses, units, routes, frequencies, missing orders and unknown clinical qualifiers. The original response and its audit text are preserved. This supports an older deployed gateway without waiting for a backend redeployment; the backend's partial-modification path also stops appending audit prose to its prescription string.

A normal stream close after the reducer's completion event no longer overrides the pending result fetch. Genuine result-loading failures suppress the loading banner and retain the retry control; retry reconnects without starting another evaluation.

Read-only verification against the actual deployed P044 response confirmed: HTTP 200, completed result, old comparison rejected it, new comparison accepted it, and a different requested dose remained rejected. No patient or evaluation state was changed by that verification.

## Verification

- 44 Python regression tests passed, including dosage, persistence and FHIR client coverage.
- 25 Node/React regression tests passed.
- Next.js production build and TypeScript checking passed.
- `git diff --check` passed.

The HTTP integration tests use FastAPI ASGI requests through the real extraction, resume, SSE and package routes, real coordinator logic, and the real persistence client connected to an HTTPX mock database transport. They cover two consecutive modifications for both an oral order and an IV order. They assert the database PATCH and returned row, action, specialist input, stored medication, dose instructions, iteration number, original prescription and accumulated report history. Local mirror writes use temporary files.

The database transport and external specialist responses are test fixtures. These tests establish the application's state and data flow, not clinical correctness, provider availability or live database durability. React/jsdom tests use the actual confirmation dialog and intake component, isolating server actions in the intake tests. They verify cancellation, failed saves, confirmed submission and restoration of a saved order. The tests do not mutate the public demo or the repository's patient fixtures. This verification did not include Safari UI interaction.

## Confirmed persistence

- Both intake and post-evaluation modification paths show the patient, current/proposed prescription and doctor's note before saving. Opening or cancelling the dialog performs no write. Duplicate clicks are blocked while saving.
- The frontend checks `/api/orchestrator/capabilities` before submitting a save, so an older gateway cannot silently treat a modification as a cache-only success. The endpoint advertises the supported contract, not current database health.
- Confirmed writes require an exact patient ID, complete positive dosage and a matching Supabase response row. Missing credentials, network failures, HTTP errors, empty updates and mismatched values are errors. Only a verified receipt permits the UI to show success and restart evaluation.
- Existing evaluations retain their original prescription when a save fails. Initial evaluations do not persist unconfirmed prescription or demographic fields. Saving through `/api/fhir/update` does not re-label an old verdict.
- Supabase is authoritative for restart hydration. Local mirrors update atomically after cloud confirmation; mirror failure does not invalidate an already confirmed cloud save.
- Patient updates and report appends compare `updated_at` before writing. A report append retries from the current row instead of overwriting a concurrently changed prescription.
- Saved prescriptions take precedence over intake scenario presets. Remote evaluation guardrail results are no longer overwritten with a locally forced pass after demographic resupply.

The configured Supabase hostname initially returned public DNS `NXDOMAIN`. On the follow-up check, public DNS resolved and an authenticated read of the existing patient table returned HTTP 200. The local resolver still had a cached negative answer, so that read used the public DNS answer while keeping TLS verification enabled. The live schema has no standalone `prescribed_action` column: prescription updates and verification now use `clinical_data.prescribed_action` in the existing JSONB column, alongside medications and dosage instructions. The `patients` table needs `patient_id`, `clinical_data`, `updated_at`, `age` and `sex` columns, all present in the inspected schema. No database migration or live patient mutation was performed. The writeback contract targets this application's Supabase table; it does not claim to update an external FHIR server.

## Reproduce

From the repository root, use a Python environment with the gateway dependencies and pytest installed, and Node.js with TypeScript stripping support:

```sh
PYTHONPATH=apps/gateway python -m pytest -q apps/gateway/tests packages/mcp-ehr/tests/test_fhir_client.py
pnpm --dir apps/web test
pnpm --dir apps/web build
git diff --check
```

Deploy the gateway changes before enabling confirmed saves in the frontend. Check that its capability response contains `confirmed_prescription_updates: true` and `persistence: "supabase_verified"`. After restoring Supabase, verify a confirmed change against the persisted row and after a process restart before claiming live durability.

### pnpm install on Vercel

The first confirmation-dialog deployment failed during dependency installation with `ERR_PNPM_IGNORED_BUILDS` for `esbuild@0.28.2`. `pnpm-workspace.yaml` now explicitly approves that exact version's install script using `allowBuilds`. A temporary checkout reproduced the failure without the approval, then installed successfully with it and compiled TypeScript through esbuild. Dependency script checks remain enabled.
