## Why

SurfaceMapping and Projection Source provide the data needed to inspect a
surface point, but there is no interaction. Users cannot identify which
surface, triangle, parametric cell, UV or world point lies under the cursor.

## What Changes

- Add pure cursor → artboard → world ray utilities.
- Add perspective and orthographic world ray construction.
- Add double-sided ray–triangle intersection and nearest-hit occlusion.
- Resolve UV through SurfaceMapping and world barycentric coordinates.
- Add a `SurfacePickResult` contract with surface/mesh/triangle/cell/UV/XYZ/
  depth identity.
- Add a compact Surface Inspector in single Canvas.
- Keep picking UI-only and out of render, captures and exports.

## Capabilities

### New Capabilities

- `surface-inspection`: world-space surface picking and readout.

### Modified Capabilities

- None.

## Impact

- New: `src/interaction/ray.js`, `src/interaction/surfacePicker.js`,
  `src/ui/SurfaceInspector.js`.
- Modified: `src/application/App.js`, `src/ui/Controls.js`,
  `src/render/p5/P5Adapter.js`, `style.css`.
- Tests: `test/lab.smoke.mjs`, `e2e/surface.spec.js`.
- Docs: README, SPEC, architecture, audit, diagnosis, roadmap.
- No geometry, mapping, projection, RenderScene, frame or export changes.

## Non-goals

- No Quad picking or panel hit-testing.
- No persistent selection or object selection beyond surfaces.
- No geometry/UV editing, vertex manipulation or CAD.
- No z-buffer, ray tracing or spatial acceleration structure.
- No export or serialization of inspection data.
