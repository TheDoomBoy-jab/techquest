# Deployed TechQuest verification

Website: https://techquest-roan.vercel.app

The public browser bundle configures https://techquest-z8iw.onrender.com as its gateway. Checking the current checkout's API paths on the Vercel host alone did not test that deployed backend. The earlier assessment based only on public HAPI seed IDs was too broad.

## Verified behavior

The homepage returned HTTP 200. The actual gateway returned HTTP 200 for `/health` and `/api/patients`, exposing 54 records. Six public synthetic demo scenarios were exercised using the website's normal start-run, event-stream and completed-package flow. Every start, stream and post-completion package request returned HTTP 200. Every case emitted completed events for all four specialist/client agents and the arbitration reducer, with four report-history entries.

| Scenario | Demographic guardrail | Safety guardrail | Rule result | Verdict |
|---|---|---|---|---|
| P001 | PASSED | PASSED | COMPLIANT | JUSTIFIED |
| P034 | FAILED | PASSED | COMPLIANT | NOT_JUSTIFIED |
| P035 | PASSED | BREACHED | COMPLIANT | NOT_JUSTIFIED |
| P036 | PASSED | PASSED | NON_COMPLIANT | NOT_JUSTIFIED |
| P037 | PASSED | PASSED | NON_COMPLIANT | NOT_JUSTIFIED |
| P053 | PASSED | PASSED | COMPLIANT | JUSTIFIED |

The read-only package GET returned 404 before the corresponding evaluation had started; after evaluation it returned 200. That initial 404 did not establish a broken workflow. Raw summaries are in `deployed-backend-check.json` and `deployed-workflow-check.json`.

## Scope

The initial scenario checks used direct HTTP calls because Safari automation was unavailable. No browser visual interaction or screenshot was verified. Those initial checks did not submit accept/reject, resupply, patient-update or final clinical decision actions. Evaluation creates normal demo run state and generated review packages.

These tests establish a working deployed demonstration. They do not independently establish clinical correctness, calibrated agent confidence, provider-level model provenance, or availability of the old public HAPI patient records. The three HAPI seed references previously checked still returned 404; that is a separate external integration/data issue and does not invalidate the observed deployed demo.

## Database persistence follow-up, 2026-11-16

The updated gateway now returns HTTP 200 from `/api/orchestrator/capabilities` and advertises verified Supabase saves. A confirmed update of synthetic P044's age to its existing value returned HTTP 200 with a verified receipt. An independent Supabase read matched the receipt's changed save timestamp and confirmed that age and the full clinical data object stayed unchanged. The local mirror was also reported saved. No medication, dosage, or clinical decision was changed in this check. See `deployed-persistence-check.json` and `DOSAGE_FIXES.md` for evidence and scope.
