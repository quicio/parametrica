## Types

- `ProjectionId`, `Frame`, `ResolvedFrame`, `BoundsLike`, `ViewTransform`.
- `ViewPoint`, `ProjectedViewPoint`, `ArtboardRectLike`.
- `ViewCurve`, `ViewMesh`, curve/mesh/framed projection options.
- `ViewportDescriptor`, `ProjectionAxes`, `CoordinateRanges`, `TickAxis`,
  `CoordinateTicks`, `PanelLayout`.

## Rules

- The transform is a single immutable W→A mapping; framing remains presentation.
- Orthographic projection still drops the correct axis and keeps depth.
- Geometry adapters are narrowed at the boundary.
- The scene builder keeps its output while using the typed contracts.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Framing, orthographic projection, coordinates and picking behave unchanged.
