# Doctor-note modification regression fixes

Verified locally on 2026-11-16. Verification covers the source changes in this repository; deployment of these fixes has not been verified.

## Fixed behavior

- A note such as “reduce Apixaban from 40 mg to 5 mg” selects the target 5 mg. Both fallback parsers require an identifiable medication and explicit positive dose with units. Lab concentrations such as mg/dL do not become prescription quantities.
- Remote model extraction is checked against the note's explicit target. A model returning the old dose is rejected in favor of deterministic extraction; the displayed action is rebuilt from the structured prescription.
- “Give” no longer accidentally matches the IV route. Complete structured modifications preserve the drug, dose, unit, route and frequency when passed to the coordinator.
- The resume operation saves once, reloads the updated patient medication list, and evaluates that input. Medication storage keeps the full order, including IV cycle frequencies. Partial patient IDs cannot update a different patient's record.
- Re-evaluation preserves the original order and report history across successive modifications. Restarting the stream no longer starts a second initial evaluation that discards this history.
- Failed HTTP requests no longer become successful modifications in the UI. The note and extracted prescription remain available for retry; editing the note invalidates previous extraction, including late responses.
- Result loading checks the requested prescription. Stream failures show an error and retry control instead of invented completion cards, confidence values and timings. Retrying reconnects to the existing run.

## Verification

- 14 Python regression tests passed.
- 5 Node regression tests passed.
- Next.js production build and TypeScript checking passed.
- `git diff --check` passed.

The HTTP integration tests use FastAPI ASGI requests through the real extraction, resume, SSE and package routes, real coordinator logic, and patient persistence to temporary JSON files. They cover two consecutive modifications for both an oral order and an IV order. They assert the action, specialist input, stored medication, dose instructions, iteration number, original prescription and accumulated report history.

External specialist responses and Supabase writes are stubbed in these tests. They establish the application's state and data flow, not clinical correctness, provider availability or live database durability. The tests do not mutate the public demo or the repository's patient fixtures. This verification did not include Safari UI interaction.

## Reproduce

From the repository root, use a Python environment with the gateway dependencies and pytest installed, and Node.js with TypeScript stripping support:

```sh
PYTHONPATH=apps/gateway python -m pytest -q apps/gateway/tests/test_dosage_modification.py
node --experimental-strip-types --test apps/web/tests/prescription.test.mjs
pnpm --dir apps/web build
git diff --check
```

The patient service still treats disk/Supabase persistence failures as warnings. A successful local update therefore does not establish that a remote database write succeeded; this patch does not change that persistence contract.
