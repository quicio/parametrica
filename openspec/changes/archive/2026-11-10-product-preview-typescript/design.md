## Types

- `MeshLike`, `MeshBounds`, `PreviewScene`, `PreviewSpatial`, `PreviewLayer`.
- `MaterialSpec`, `MaterialDefinition`, `QualityDefinition`.
- `DragState`, `PreviewApp`.
- THREE types come from `@types/three`.

## Rules

- Mesh input is narrowed before buffer construction.
- Camera transitions reuse typed orbit/zoom helpers.
- Materials, quality tiers, lights, composer and capture are unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Mount, update, orbit/zoom, quality degradation, capture and benchmark are
  unchanged.
