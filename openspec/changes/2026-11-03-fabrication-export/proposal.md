## Why

`geometryExport.js` is only a contract stub. A fabrication workflow needs a real
geometry exporter that consumes world Mesh/Solid data and refuses unsound
meshes. This phase validates the fabrication pipeline without adding a MAKE UI.

## What Changes

- Implement binary STL export from validated world Mesh/Solid geometry.
- Gate export on fabrication validation.
- Apply explicit `mmPerWorldUnit` from Phase 4B.
- Emit deterministic facets, finite normals and unit metadata.
- Explicitly reject open, non-manifold, inconsistently oriented and degenerate
  geometry.
- Keep 3MF, multi-body, repair and MAKE UI out of scope.

## Capabilities

### New Capabilities

- `fabrication-export`: binary STL for validated world geometry.

### Modified Capabilities

- `fabrication-contracts`: concrete export gate and STL behavior.

## Impact

- `src/export/geometryExport.js` and a new STL exporter module.
- Validation/scale helpers.
- Unit tests for STL bytes/geometry, validation failures and determinism.
- No renderer, p5, camera, document view or artboard export change.

## Non-goals

- No 3MF in this change.
- No CSG, caps, repair, booleans or multi-body packing.
- No MAKE/Fabricate workspace.
- No slicer integration, materials or print settings.
- No implicit unit conversion.
