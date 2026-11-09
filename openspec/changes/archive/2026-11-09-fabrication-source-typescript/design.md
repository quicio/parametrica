## Types

- `EvaluationLike`, `LayerLike`, `MeshLike`, `SolidLike`, `GeometryLike`.
- `FabricationPreparation`, `Candidate`, `ResolvedFabricationSource`,
  `FabricationReport`.
- `ValidationLike`, `GroupedResult`.

## Rules

- Geometry adapters are validated before use.
- Null candidates are filtered before boolean/merge operations.
- Unknown report/repair stats stay `Record<string, unknown>`.
- The public return types are explicit.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- STL/3MF, grouped and lattice/perforated presets behave unchanged.
