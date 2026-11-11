## Types

- `Parametric3DParams`, `HelixParams`, `SurfaceParams`.
- 3D/surface params carry index signatures for resolved params.
- Projection geometry is cast once at the view boundary.

## Rules

- Sampling, projection, seams and surface domains are unchanged.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- 3D and surface geometry is unchanged.
