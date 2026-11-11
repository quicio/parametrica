## Types

- `LorenzParams`, `DiscreteParams`, `AizawaParams`.
- `IterateOptions`, `Point2`, `Point3`.
- Optional z components are normalized during iteration/projection.

## Rules

- Attractor math, starts, skip and projection are unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Attractor geometry is unchanged.
