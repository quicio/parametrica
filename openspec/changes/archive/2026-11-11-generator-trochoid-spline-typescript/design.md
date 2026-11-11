## Types

- `TrochoidParams`, `SpiroParams`, `SampleOptions`.
- `NodeOptions`, `CatmullParams`, `BezierParams`, `CubicParams`.
- Point helpers return `{ x, y }`.

## Rules

- Turn derivation, sampling and spline math are unchanged.
- Registration and output are unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Trochoid and spline geometry is unchanged.
