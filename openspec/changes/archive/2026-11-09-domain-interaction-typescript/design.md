## Types

- `Vec2`, `Vec3`, `Ray3`, `TriangleHit`, `OrthoDepth`.
- `TransformLike`, `BoundsLike`, `ArtboardRectLike`.
- `MappingFace`, `SurfaceMapping`, `MeshLike`, `EvaluationLayerLike`,
  `SceneLike`, `EvaluationLike`, `PickResult`.

## Boundary rules

- Unknown adapter data is narrowed before use.
- Mesh vertices/faces are validated with array checks.
- Face indices are checked before indexing.
- Mapping faces are validated before UV/cell extraction.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Picking and inspection behavior is unchanged.
