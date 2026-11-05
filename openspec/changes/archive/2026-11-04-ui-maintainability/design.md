## Context

The monoliths are not correctness bugs, but they slow every future slice and
increase merge risk.

## Decisions

### D1: Inspector section modules

Create `src/ui/sections/` modules for:

- form: layers, instance, generator, parameters, equations, harmonics, operators
- look: looks, camera, canvas, coordinates, scale, style, render, overlays
- fabricate
- keep: presets, export
- explore/perform/ingest as needed

`Controls` keeps mode/accordion orchestration and section registration.

### D2: p5 overlay modules

Move to `src/render/p5/` helpers:

- `drawQuadView`
- `drawCoordinateOverlay`
- `drawReference`
- `drawSeamOverlay` / `drawInspectionOverlay`

P5Adapter keeps the p5 backend, pointer routing and frame orchestration.

### D3: Test modules

Split `test/lab.smoke.mjs` by domain and import shared assertions/setup:
math, generators, operators, document, geometry, surfaces, instances, presets,
export, UI-independent panels, etc. `npm test` runs the same aggregate.

### D4: Parity

The refactor is accepted only if all gates pass unchanged. No visual or
document snapshot changes are expected.

## Risks / Trade-offs

- Large diff with low product value.
- Import boundaries can create cycles; add boundary tests.
- Test split can hide setup regressions; keep one aggregate command.

## Open Questions

- Split CSS in the same slice or later?
