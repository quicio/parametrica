## Why

Parametric surfaces expose `Surface.domain`, but the canvas has no way to show
the U/V parameter domain, its real bounds, orientation, sampling or closure.
Users see the world result but not the parameter rectangle that produced it.

## What Changes

- Add a pure, read-only Surface domain summary.
- Resolve the active visible surface from the evaluation.
- Add a compact UV Domain inset with U/V bounds, low-density grid, axis
  orientation, sample counts and closure/seam markers.
- Add a Canvas UV Domain toggle, persisted as UI-only state.
- Hide the inset when the active layer is not a valid surface.
- Keep the inset out of ViewTransform, frame, bbox, Spatial Reference and all
  exports.

## Capabilities

### New Capabilities

- `uv-domain`: read-only parameter-domain visualization for surfaces.

### Modified Capabilities

- None.

## Impact

- New: `src/geometry/uvDomain.js`, `src/ui/UVDomainInset.js`.
- Modified: `src/application/App.js`, `src/ui/Controls.js`, `style.css`.
- Tests: `test/lab.smoke.mjs`, `e2e/surface.spec.js`.
- Docs: README, SPEC, architecture, audit, roadmap.
- No document format, geometry, generator or export change.

## Non-goals

- No UV ↔ XYZ interaction or point selection.
- No UV export.
- No second viewport.
- No physical units, snapping or CAD.
- No parametric-domain operators.
- No changes to Spatial Reference unless a dependency appears.
