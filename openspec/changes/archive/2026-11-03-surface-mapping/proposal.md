## Why

The welded mesh cannot represent seams and twists with one UV per vertex. It
also does not store the real domain endpoints or the logical cell of each
triangle. A robust future UV ↔ XYZ implementation needs an explicit mapping
generated before wrap/flip destroys the logical parameter correspondence.

## What Changes

- Add `SurfaceMapping` as an explicit sidecar produced by tessellation.
- Preserve real U/V endpoints, closure, seams, twists and logical cells.
- Store per-triangle cell, triangle index, mesh vertex indices and real
  per-corner UVs.
- Add `tessellateSurfaceWithMapping`; keep `tessellateSurface` compatible.
- Cache meshes and mappings together in the engine.
- Expose `evaluation.surfaceMappings` and `layer.surfaceMappings`.
- Keep the mapping out of `Mesh.meta`, `RenderScene`, render and export.

## Capabilities

### New Capabilities

- `surface-mapping`: explicit parametric correspondence sidecar.

### Modified Capabilities

- None.

## Impact

- Modified: `src/geometry/surfaceTessellation.js`, `src/core/engine.js`.
- Tests: `test/lab.smoke.mjs`.
- Docs: README, SPEC, architecture, audit, roadmap, diagnosis note.
- No geometry, render, export, UI or document format change.

## Non-goals

- No picking, hover, click, ray casting or z-buffer.
- No UV Inspection UI or face highlighting.
- No Quad interaction.
- No RenderScene changes.
- No units, CAD or fabrication.
- No changes to the UV Domain inset.
