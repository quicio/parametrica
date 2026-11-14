## 1. Estimator

- [x] 1.1 Add deterministic triangle sampling and BVH ray casting.
- [x] 1.2 Return min/p05/median in millimetres with hits and misses.
- [x] 1.3 Handle open, empty and oversized meshes as unavailable.

## 2. Report

- [x] 2.1 Pass the measurement into the manufacturing report.
- [x] 2.2 Replace the fixed wall check with the estimated evidence.
- [x] 2.3 Expose the measurement on the fabrication report.

## 3. Verification

- [x] 3.1 Add hollow-shell, solid, scale and determinism fixtures.
- [x] 3.2 Update the manufacturing report tests.
- [x] 3.3 Add an e2e Fabricate assertion and update docs.
- [x] 3.4 Run gates, archive and release.

## Acceptance criteria

- Hollow bodies report an estimated minimum wall with sample evidence.
- A body below the profile minimum fails or warns according to gating.
- Open or empty meshes remain unknown and do not pass silently.
- No geometry, export or document-format change.
