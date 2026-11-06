## Why

Fabricate already reports overhang, bed contact, a minimum feature and lattice
opening results, but the values are heuristic and the thresholds are hardcoded.
A 2 mm feature warning means the same thing for FDM, resin and an arbitrary
process. The report cannot say whether a value was measured on the mesh,
declared by the lattice source or estimated by a proxy. Export is gated by
geometry validity and units only, not by an explicit manufacturing policy.

This is the missing `ManufacturingProfile` contract from the architecture
audit. It is not a slicer. It is the evidence layer that makes the existing
warnings explainable and lets the user choose whether a manufacturing warning
blocks export.

## What Changes

- Add a serializable `ManufacturingProfile` under the fabrication view (field
  name provisional).
- Add process presets (`FDM 0.4`, `Resin`, `Custom`) with explicit minima and
  overhang angle.
- Produce a `ManufacturingReport` with checks, limits, values, source,
  severity and an overall state.
- Distinguish `measured`, `declared`, `estimated` and `unavailable`.
- Reuse the existing overhang, bed, minimum-feature and opening-gauge
  measurements; do not duplicate geometry work.
- Keep geometric invalidity as a hard export block. Manufacturing warnings are
  warnings by default; `block` mode is opt-in.
- Pass the resolved profile through preparation, worker, report and export.
- Add a manual external-slicer verification record; it is not a CI gate.

## Out of Scope

- No slicer, layer preview, support generation or toolpath simulation.
- No automatic orientation in this slice; report the current orientation and
  leave auto-orientation as a future decision.
- No fake wall-thickness measurement. If the source does not declare it and no
  mesh-based estimator is implemented, the check is `unavailable`.
- No document version bump; the new view fields are optional and sanitized.
- No renderer or PBR work.
- No change to the meaning of geometry validity or units.

## Dependencies

- `fabrication-contracts`, `fabricate-workflow`, `fabrication-export`,
  `fabrication-worker`.
- `2026-11-06-lattice-cell-contracts` for network openings and provenance.
- `2026-11-06-organic-struts` for strut, joint and finish-quality stats.
- `2026-11-06-lattice-refinement` for the capsule gauge and measured deviation.

## Impact

- `src/core/document.js`: sanitized optional profile.
- `src/application/fabricationSource.js`: report assembly and export policy.
- `src/geometry/printChecks.js`: generic check list with source labels.
- `src/ui/sections/fabricateSections.js`, `src/ui/Controls.js`: profile and
  report UI.
- `src/workers/fabricationWorker.js`: resolved profile in preparation.
- Tests, docs and preset defaults.

## Open Questions

1. Is `view.fabrication.manufacturing` the right persistence location, or
   should the profile live beside `printability` as report-only metadata?
2. Is `warn` the correct default for every manufacturing check, or should
   `minOpening` block for a preset explicitly marked production-ready?
3. Should `minWall` be declared by the source, measured on the mesh, or left
   `unavailable` until a budgeted thickness estimator exists?
4. Which process preset values are defensible without a printer-specific
   calibration? Treat them as provisional until recorded.
5. Should the report keep a manual slicer-verification record in the document
   or only in the exported audit JSON?
