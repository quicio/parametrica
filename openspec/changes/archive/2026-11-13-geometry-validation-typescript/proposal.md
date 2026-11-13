## Why

Validation and printability reporting are the public quality gates for
fabrication. Typing their inputs and result metadata keeps downstream
manufacturing reports honest.

## What Changes

- Convert `geometry/validate.js` to `.ts`.
- Convert `geometry/printChecks.js` to `.ts`.
- Type validation results, mesh edge bookkeeping and print summaries.
- Keep JS compatibility re-exports and adjust the fabrication cast.

## Out of Scope

- Repair, CSG, remesh and lattice kernels.
