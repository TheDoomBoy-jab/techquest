# FHIR data-path audit

The repository contains 49 seeded alias mappings and 53 local expanded patient fixtures. The client prioritizes those local fixtures before making a live HTTP request. Their trial/cohort assignments are synthetic demo metadata, not learned evaluation outcomes. The client now identifies local fixture results with `data_source=local_synthetic_fixture`.

## Corrected issues

- Missing age, consent capacity and pregnancy-test result remain unknown (`None`) instead of silently becoming 50, true and negative.
- Invalid birth dates no longer fabricate age 50.
- ALT maps to LOINC [1742-6](https://loinc.org/1742-6/). The previous [1751-7](https://loinc.org/1751-7/) is albumin, not ALT. Other terminology mappings still need a comprehensive clinical terminology review.
- FHIR_BASE_URL can be supplied through the environment.
- Identifier-tag search is reachable for identifiers absent from the alias maps.

## Verification

Four regression tests passed: unknown-value handling, albumin not parsed as ALT, correct ALT observation parsing, and retrieval of every local fixture without HTTP. Fixture IDs are unique. Test path: `tests/test_fhir_client.py`.

After explicit user approval, checked the first three seeded aliases against the configured public HAPI test server. All three returned HTTP 404 for both `Patient/{id}` and `Patient/{id}/$everything`. The seeded references are therefore unavailable at that endpoint at the time of checking. Only status/count metadata is retained in `fhir-live-check.json`; no patient response contents were persisted. Local fixture lookup works, but a functioning live integration needs valid records on the configured endpoint. No server records were created or modified.
