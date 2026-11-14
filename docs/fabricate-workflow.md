# Fabricate workflow

Fabricate is a guided single-panel workflow: Source → Repair → Combine → Output
→ Checks, with a plan, a suggested resolution and a next action.

## Groups

- **Source** — body scope and count.
- **Repair** — quality preset, weld/cap, Repair, cap strategy, topology,
  non-orientable handling, self-intersection strategy and resolution.
- **Combine** — boolean operation and CSG strategy.
- **Output** — format, world scale and export.
- **Checks** — source, triangles/vertices/volume, bounds, warnings, preparation
  and repair report.
- **Manufacturing** — profile, process minima, evidence checks and slicer
  verification. Minimum wall is estimated from sampled surface rays; the
  detail shows p5, absolute minimum, median and sample count.

Existing controls, classes and behavior are unchanged.

## Plan

`fabricate-plan` summarizes the intended operation, for example:

```text
Plan · composition · repair sdf @64 · union (auto) · 3MF · mm
```

It reflects preparation and report state; it is not a second source of truth.

## Quality presets

- Draft → 32
- Standard → 64
- High → 128
- Custom → manual resolution

Changing the preset writes `view.fabrication.remeshResolution`. Editing the
resolution manually sets `quality = 'custom'`.

## Suggested resolution

Advisory only, derived from the source or evaluation bbox diagonal:

- < 10 units → 32
- < 30 → 64
- otherwise → 128

The suggestion never changes settings automatically.

## Next action

Explains the first blocker:

- set an explicit world scale;
- select a spatial layer with a closed body;
- enable Repair/Cap;
- choose Auto/Manifold SDF;
- select at least two bodies for a boolean;
- ready to export.

The detailed checks and worker errors remain available below.

## Behavior

No geometry, worker, validation, document or export algorithm changed.
