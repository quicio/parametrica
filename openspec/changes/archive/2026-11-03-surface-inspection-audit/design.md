## Context

Audit reproduced issues not covered by the original happy-path tests. The
picking math itself was correct for normal scales, but layer/frame policy,
renderer state, numeric tolerances and UI lifecycle needed correction.

## Decisions

### D1: Composition selection

In `composition` each layer has an independent frame; a cursor point maps to a
different world ray per layer. Comparing world `t` across those rays is invalid.
Inspection filters to `activeLayerId`. Without an active layer id, composition
returns no hit explicitly.

### D2: Quad state

`P5Adapter.quadActive` is the authoritative render state. Inspector and App use
it, not `view.layout` alone. Layout changes notify `SurfaceInspector` so the
message updates without waiting for an evaluation.

### D3: Numerical tolerance

Möller–Trumbore determinant tolerance is relative to triangle edge scale, and
`t` only needs to be positive. This supports tiny surfaces and close positive
distances without accepting degenerate/behind hits.

### D4: Mapping validity

Mapping status is `mismatch` when face indices do not match or the interpolated
UV is not finite. No UV is displayed in that case.

### D5: Lifecycle

Viewport resize triggers inspection refresh. Inspector messages are cached to
avoid DOM churn during playback/evaluation.

## Risks / Trade-offs

- Composition inspection is active-layer-only by design.
- Relative determinant tolerance is more permissive for tiny/degenerate scales;
  barycentric and positive-t checks still gate hits.
- Quad picking remains out of scope.
- Transparency and seam-boundary ambiguity remain documented limitations.
