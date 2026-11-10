## Types

- `DescriptorDocument`, `DescriptorOptions`, `CurveLike`, `LayerLike`.
- `FigureDescriptor` with bbox, curvature, symmetry, Fourier, complexity,
  coverage, topology, spatial and layer results.
- `CurveAnalysis` is reused from differential analysis.

## Rules

- Descriptor math, sampling budgets and intersection budget are unchanged.
- Hash output and canonical serialization are unchanged.
- Recursive layer descriptors keep the same filtering and ordering.

## Verification

- `tsc --noEmit`, Node, arch and e2e gates pass.
- Descriptor values, hashes and layer descriptors are unchanged.
