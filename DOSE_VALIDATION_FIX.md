# False dose approval: P010 regression

On 2026-11-16, a read-only request to the deployed P010 package returned `Apixaban 100000 mg oral twice daily`, `JUSTIFIED`, `SAFE`, and `needs_human_review: false`. This confirms a false approval, independently of successful database persistence.

## Causes

- Dose detection compared strings against a short list such as `40 mg` and `60 mg`; other numbers bypassed it.
- The coordinator forcibly replaced specialist results with passing assessments for P001–P032 and several other demo IDs.
- The frontend could manufacture a clinical result when the gateway was unavailable. Successful parsing and persistence were also insufficient prerequisites for clinical approval.

## Changes

- Removed all patient-ID assessment overrides and the frontend's fabricated-result fallback.
- Added a shared, versioned demo formulary in `apps/web/lib/dose-policy.json`. Numeric mass units are normalized, route and frequency are checked, and only configured quantities qualify for further review. Unknown or unsupported regimens require review. Passing this boundary alone does not establish patient-specific safety or trial eligibility.
- Enforced the boundary at extraction, confirmation, server actions, gateway mutations, patient updates, direct persistence, specialist output, and final consensus. An optimistic model cannot override a failed boundary.
- Acceptance requires an aligned completed evaluation. Failed decision submissions no longer become local successes.
- The frontend rechecks old results, including P010's false approval, and refuses prescription submissions to a gateway without the matching dose-policy version.
- HITL proxy fallback runs after the dynamic result handler, so direct requests to the public result API also pass through the dose guard. A local Next.js HTTP integration check used a backend fixture returning the exact false P010 approval; the public route returned HTTP 200 with `NOT_JUSTIFIED` and `UNSAFE`.

The Apixaban limit is for this demo's selected antithrombotic regimen, not a universal prescribing maximum. Labeling includes indication-dependent regimens outside this demo's scope. Label references are recorded per medication in the configuration: [Apixaban](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=7be1f4c1-bb2f-4ded-ae9a-515d2a22f93e), [Empagliflozin](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=59ed43d9-b4e0-72a2-e063-6394a90a327d), [Pioglitazone](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d2ddc491-88a9-4063-9150-443b4fa4330c), [Pembrolizumab](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=9333c79b-d487-4538-a9f0-71b91a02b287). These checks are demonstration software and require expert validation before clinical use.

## Verification and deployment

Regression coverage includes the reported 10000/100000 mg cases, nearby arbitrary values, g/mcg conversions, zero/negative/unsupported quantities, interval-specific biologic limits, optimistic models, specialist outages, renamed patient IDs, and rejection before database writes. Server-action tests exercise the actual result, extraction, acceptance, and update functions. These tests isolate external providers and database transport; they do not establish clinical accuracy.

Deploy both frontend and gateway. The gateway capability response must include `dose_policy_version: "demo-dose-policy-v1"`. The frontend blocks prescription saves until this version is present. Existing demo records and historical false approvals were not rewritten or replaced with guessed prescriptions.

## Live verification, 2026-11-17 (Asia/Kolkata)

The deployed gateway returned HTTP 200 with `dose_policy_version: "demo-dose-policy-v1"`. Prescription-save requests for 10000 mg, 100000 mg and 10 g Apixaban against a nonexistent test ID each returned HTTP 422 with a dose-boundary rejection. No existing patient's prescription was targeted by those save requests.

A fresh initial review of synthetic P010 for `Apixaban 10000 mg oral twice daily` returned HTTP 200 with the matching action, `NOT_JUSTIFIED`, `UNSAFE`, `EXCEEDS_LIMIT`, and `needs_human_review: true`. This created review state; no prescription-save or acceptance request was submitted for P010. The result is recorded in `deployed-dose-policy-check.json`.
