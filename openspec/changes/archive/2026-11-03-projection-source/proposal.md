## Why

Projected meshes currently discard world coordinates and set orthographic depth
to zero. That blocks future XYZ inspection and depth-aware interaction, and it
cannot be repaired from the projected 2D vertices. The projection needs an
explicit, opt-in origin correspondence.

## What Changes

- Add `preserveSource` to mesh projection helpers.
- Attach an explicit `mesh-projection-source` sidecar when requested:
  - source mesh id;
  - alias to canonical world vertices;
  - explicit source vertex indices;
  - per-vertex orthographic depth for XY/XZ/YZ.
- Keep per-vertex render `depth` unchanged (zero in orthographic) so painter
  behavior and visual output stay identical.
- Keep the source sidecar out of RenderScene, picking, UI and exports.
- Make the sidecar opt-in so normal rendering pays no source allocation.

## Capabilities

### New Capabilities

- `projection-source`: explicit world/vertex/orthographic-depth sidecar.

### Modified Capabilities

- None.

## Impact

- Modified: `src/view/projection.js`.
- Tests: `test/lab.smoke.mjs`.
- Docs: README, SPEC, architecture, audit, roadmap, diagnosis note.
- No geometry, tessellation, SurfaceMapping, frame, bbox or export change.

## Non-goals

- No picking, ray casting, hover, click, selection or highlighting.
- No z-buffer.
- No Quad panel hit-testing.
- No UV inspection UI.
- No RenderScene changes.
- No units, CAD or fabrication.
