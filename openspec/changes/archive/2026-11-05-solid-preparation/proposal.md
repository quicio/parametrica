## Why

Parametric surfaces are usually open meshes, so Fabricate cannot export them.
Users can build forms worth making but have no way to close a boundary or weld
duplicate vertices without leaving Parametrica. The Phase 4 fabrication gate is
intentionally read-only; the next step is explicit, inspectable preparation,
not silent repair or full CAD editing.

## What Changes

- Add a pure geometry module for mesh weld, boundary-loop detection, cap and
  merge operations.
- Add optional `view.fabrication` preparation settings: weld, cap, tolerance
  and maximum hole size.
- Apply preparation only to the derived fabrication source when explicitly
  enabled.
- Show preparation controls, changes and warnings in Fabricate.
- Keep render geometry, SurfaceMapping, document layers and SVG/PNG unchanged.
- Keep preparation off by default so existing exports behave exactly as before.

## Capabilities

### New Capabilities

- `solid-preparation`: deterministic weld, boundary loops, caps and merge.

### Modified Capabilities

- `fabrication-contracts`: prepared sources still pass the validation gate.
- `make-workspace`: explicit preparation controls replace the blanket
  "no repair" statement while keeping the mode read-only.

## Impact

- `src/geometry/solidPrep.js`
- `src/application/fabricationSource.js`
- `src/core/document.js` view metadata
- Fabricate panel
- STL export path
- Unit/e2e tests and docs

## Non-goals

- No CSG or booleans.
- No self-intersection detection.
- No multi-body export.
- No automatic repair on export.
- No render-geometry or document-layer mutation.
- No new dependency.
