## Types

- `EvaluationLike`, `DocumentLike`, `ViewLike`, `PreviewLike`.
- `GroupLike`, `PreparedGroup`, `LayerResult`.
- `CurveLike`, `MeshLike`, `VectorLike`, `StyleLike`, `TransformLike`.

## Rules

- Unknown adapter fields are narrowed before use.
- JS view/projection functions are treated as adapter boundaries with explicit
  result casts.
- The scene cache is typed as `WeakMap<object, { signature, scene }>`.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- The scene build output and cache behavior are unchanged.
