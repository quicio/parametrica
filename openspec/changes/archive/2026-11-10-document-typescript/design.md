## Types

- `DocumentShape`, `ViewShape`, `LayerShape`, `StyleShape`, `AnimationShape`.
- `GeneratorStageShape`, `OperatorStageShape`, `TraceShape`.
- `DocumentOverrides`, `LayerOverrides`, `FabricationGroupShape`.
- Existing view/frame/reference/units/timeline contracts are reused.

## Rules

- Raw input is narrowed through `Rec` and sanitizers before use.
- Defaults stay independent objects; frozen templates stay frozen.
- Layer aliases keep the same enumerable/non-enumerable behavior.
- Legacy v1 documents still migrate to bilateral-spline.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Document defaults, sanitization, aliases and migration behave unchanged.
