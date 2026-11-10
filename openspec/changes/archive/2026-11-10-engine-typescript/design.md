## Types

- `EnginePoint`, `EngineCurve`, `EngineGeometry`.
- `EngineError`, `EngineStats`, `EngineBBox`.
- `EngineLayerResult`, `EngineEvaluation`.
- `EvaluateOptions`, `StageLike`, `StageCacheEntry`, `MeshEntry`.

## Rules

- Stage definitions are narrowed at the registry boundary.
- Geometry projections/casts happen once at the adapter edge.
- Caches keep the same signatures, keys and reuse policy.
- Budgets, discontinuity splitting and layer/instance ordering are unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Evaluation, caching, projections, budgets and layer output are unchanged.
