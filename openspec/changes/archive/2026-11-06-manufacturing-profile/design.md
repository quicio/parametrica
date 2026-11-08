## Context

Verified baseline:

- `src/geometry/printChecks.js` computes overhang area, bed contact and a
  minimum feature. It hardcodes a 2 mm feature warning and defaults to a 50°
  overhang angle.
- `src/application/fabricationSource.js` passes the lattice radius as
  `minFeature`, adds lattice strut/joint/opening data when available, and marks
  the source exportable from geometry validity and units.
- `src/core/document.js` stores `view.fabrication` as sanitized optional
  settings. `finishQuality` is separate from the repair/SDF `quality`.
- `src/workers/fabricationWorker.js` receives a serialized `preparation`; it
  does not resolve manufacturing defaults on its own.
- `exportBinarySTL` and `export3MF` gate on geometry validation, not on
  printability warnings.
- The lattice solid already reports `minStrutDiameter`, `minJointDiameter`,
  `openingTargetWidth`, `openingGauge` and `finishQuality`.
- There is no wall-thickness estimator and no orientation optimiser.

## Manufacturing profile

```text
ManufacturingProfile {
  version: 1
  process: 'fdm' | 'resin' | 'custom'
  nozzle: number | null
  minWall: number
  minStrut: number
  minOpeningWidth: number
  overhangAngle: number
  bedTolerance: number
  gating: 'warn' | 'block'
  orientation: 'current'
  units: 'mm'
}
```

Proposed persistence: `view.fabrication.manufacturing`. The field is optional,
sanitized, and does not change the document version. A preset may ship a
profile; a user may switch to `custom`.

Presets are **provisional**:

| Profile | minWall | minStrut | minOpening | Overhang |
|---|---:|---:|---:|---:|
| FDM 0.4 | 1.2 | 1.2 | 2.0 | 50° |
| Resin | 0.8 | 0.8 | 1.0 | 45° |
| Custom | user | user | user | user |

These values are starting points for UI and tests, not calibrated print
guarantees.

## Report contract

```text
ManufacturingReport {
  profileId: string
  process: string
  gating: 'warn' | 'block'
  overall: 'pass' | 'warn' | 'fail' | 'unknown'
  checks: Array<{
    id: string
    label: string
    valueMm: number | null
    limitMm: number | null
    source: 'measured' | 'declared' | 'estimated' | 'unavailable'
    severity: 'ok' | 'warn' | 'fail' | 'unknown'
    detail: string
  }>
  exportAllowed: boolean
  exportReason: string | null
  verifiedBySlicer: boolean
}
```

Rules:

- `measured` means the value came from the final mesh or the final opening
  gauge.
- `declared` means the source geometry declares it (for example a lattice
  strut diameter).
- `estimated` means a proxy or heuristic produced it.
- `unavailable` means the check could not be evaluated; it may not silently
  become `ok`.
- The report must not claim a slicer guarantee.

## Checks in this slice

| Check | Source | Notes |
|---|---|---|
| strut minimum | declared / measured | From lattice stats; measured when the solid exposes it |
| joint minimum | declared | From the joint method and radius |
| opening minimum | measured / estimated | Capsule gauge preferred; estimate labelled |
| overhang | measured | Existing mesh-based overhang area |
| bed contact | measured | Existing mesh-based bed area |
| wall minimum | declared / unavailable | Do not invent a number |
| envelope | measured / declared | Existing bbox; target only when the source declares one |

## Gating policy

- Invalid geometry always blocks export.
- Missing units always block export.
- Manufacturing checks warn by default.
- `gating: 'block'` blocks only checks with severity `fail`; warnings still
  allow export.
- A check with `source: 'unavailable'` never silently passes. It is `unknown`
  and does not block unless the profile explicitly requires that check.

## Worker and UI

- The main thread resolves the profile and writes it into `preparation`.
- The worker rebuilds the report from that resolved profile; it does not choose
  a different default.
- Preview and Fabricate use the same source and report. Preview may simplify
  only the display mesh.
- The UI shows profile select, minima, overhang angle, gating and a check table
  with source and severity.
- Changing the profile invalidates the report and reschedules the worker.

## External validation

A manual record may capture slicer, version, material, nozzle, layer height,
result and notes. It is documentation, not a test gate and not a print
guarantee. The in-app report must remain useful without it.

## Acceptance classification

**Functional guarantees**

- Profile is sanitized and round-trips through save/load.
- The resolved profile reaches the worker, report and export.
- Invalid geometry and missing units still block.
- Manufacturing warnings do not block in `warn` mode.
- `block` mode blocks only failing checks.
- Source labels are accurate; no heuristic is reported as `measured`.

**Quality objectives (provisional)**

- Every existing preset opens with a profile and an explainable report.
- Existing exports remain byte-compatible when the profile is defaulted.
- The report is fast enough to run synchronously outside the worker for small
  meshes and in the worker for heavy ones.

**Pending benchmarks / decisions**

- Calibrate FDM/resin values against real prints or slicer runs.
- Decide whether wall thickness gets a budgeted mesh estimator.
- Decide whether orientation recommendation belongs in this slice or later.
- Validate one lattice and one solid vase in an external slicer.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| False confidence from preset values | High | Mark provisional; show source and limits |
| Profile blocks a valid export | Medium | `warn` default; explicit `block` mode |
| Wall thickness faked | High | `unavailable` until measured |
| Worker/main-thread divergence | Medium | Resolve in main thread; test serialization |
| Report cost on dense meshes | Medium | Reuse printChecks; worker path |
| Profile persists into old documents | Low | Optional fields, sanitization, tests |
