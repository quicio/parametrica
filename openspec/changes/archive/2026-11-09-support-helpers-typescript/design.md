## Types

- `CameraState`, `Projected3D`.
- `SpatialReference`, `SpatialTransform`, `BuiltSpatialReference`.
- `RationalOptions`; `ParametricCurve`, `ParametricPoint`,
  `SampleParametricOptions`.
- `AnalysisPoint`, `ClusterPoint`, `CurveAnalysis`, `AllCurveAnalysis`.
- `Timeline`, `TimelineTrack`, `TimelineKeyframe`.
- `ResolutionContext`, `ResolutionError`, `ParamSchema`.
- `DocumentLike`, `StageLike`, `MutationOptions`.
- `OverlayContext`, `OverlayCurve`, `OverlayBBox`, `OverlayData`.

## Rules

- Helpers stay DOM-free and deterministic.
- External JS adapters are narrowed at the boundary.
- Camera, sampling, analysis, timeline and mutation output are unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Camera, analysis, timeline, mutation and overlay behavior is unchanged.
