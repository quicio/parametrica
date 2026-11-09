## Types

- `AnimationLike`.
- `FabricationPreparationLike`, `FabricationJobInput`.
- `FabricationProgress`, `FabricationReportLike`, `FabricationRunner`.
- `WorkerLike` and typed worker message payloads.

## Boundary rules

- Worker messages are `unknown` until shape-checked.
- Report payloads are normalized to `Record<string, unknown>`.
- `buildFabricationReport` is called through its inferred JS signature with an
  explicit parameter cast at the boundary.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Worker and sync fabrication paths behave unchanged.
