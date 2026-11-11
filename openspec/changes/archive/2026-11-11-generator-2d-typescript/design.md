## Types

- `PolarParams`, `CustomParams`, `FourierParams`, `NoiseParams`,
  `ConcentricParams`, `BilateralParams`.
- Harmonic rows and curve metadata are typed locally.

## Rules

- Params carry an index signature for post-processing options.
- Generator registration and output are unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- 2D generator output is unchanged.
