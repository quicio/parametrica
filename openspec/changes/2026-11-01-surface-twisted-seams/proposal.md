## Why

The Möbius Band preset now reaches its U endpoints, but its two boundary rows
coincide without sharing topology. The default wireframe and fill therefore
show a seam line, and the mesh is not welded across the half twist. The
surface pipeline needs topology-aware seam welding, not just index-to-index
wrapping.

## What Changes

- Add `seamU` and `seamV` select parameters (`normal` / `reverse`) to
  `parametric-surface`, exposed as advanced controls.
- Store the seam modes in `Surface.domain` and `Surface.meta`.
- Teach the tessellator to weld a reversed seam by mirroring the opposite
  coordinate at the wrap, sharing seam vertices and faces.
- Expose `twistU` / `twistV` in mesh metadata.
- Pair mirrored isolines into closed loops for the `stroke`/SVG compatibility
  curves, instead of drawing a false straight seam closure.
- Warn when a reversed seam's sampled endpoints do not meet.
- Update the Möbius Band preset to use `closedU: true` with `seamU: 'reverse'`.
- Add unit/e2e coverage and update `SPEC.md` §14 / README.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `parametric-surface-generator`: seam-mode parameters and Surface metadata.
- `surface-tessellation`: twisted seam welding, seam metadata and crack-free
  compatibility curves.

## Impact

- `src/generators/parametricSurface.js`
- `src/geometry/surfaceTessellation.js`
- `src/geometry/validate.js`
- `src/core/engine.js`
- `src/presets/builtins.js`, `src/presets/catalog.js`
- `test/lab.smoke.mjs`, `e2e/presets.spec.js` or `e2e/surface.spec.js`
- `README.md`, `docs/architecture.md`, `SPEC.md` §14

No document version change, no new renderer, no filled previews, no general
topology solver.

## Non-goals

- No Klein-bottle or arbitrary non-orientable surface presets.
- No repair of user expressions whose seam endpoints do not actually meet.
- No change to normal closed seams or open patches.
- No filled or shaded previews.
- No document v4 migration.
