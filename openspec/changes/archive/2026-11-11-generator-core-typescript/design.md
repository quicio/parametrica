## Types

- `GeneratorContext`, `ExpressionFn`.
- `Point`, `CurveLike`, `ComposeOptions`, `BranchFn`, `MultiCurveOptions`.
- Per-generator param interfaces for Lissajous, Rose, Superformula, Oscillator
  and Parametric.

## Rules

- Generator registration still validates definitions at load.
- Param interfaces carry an index signature for post-processing options.
- Sampling output and post-processing behavior are unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Classic generator output, domains and params are unchanged.
