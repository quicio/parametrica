## 1. 3MF triangulation

- [x] 1.1 Define deterministic triangulation for faces with more than 3 vertices.
- [x] 1.2 Reject non-planar or non-simple faces with a structured error.
- [x] 1.3 Preserve winding and source geometry.
- [x] 1.4 Count emitted triangles in the export result.
- [x] 1.5 Add quad, fan and rejection tests.

## 2. Trust lifecycle

- [x] 2.1 Define which post-processes clear `manifoldGuaranteed`.
- [x] 2.2 Clear the flag at the post-process boundary.
- [x] 2.3 Ensure validation never upgrades trust.
- [x] 2.4 Record trust in the final report/provenance.
- [x] 2.5 Add lifecycle tests for repair, caps, orientation and lattice.

## 3. Regression

- [x] 3.1 Confirm triangular meshes export identically.
- [x] 3.2 Confirm quad meshes emit complete triangle lists.
- [x] 3.3 Confirm deterministic bytes.
- [x] 3.4 Confirm existing 3MF validation gate is unchanged.
- [x] 3.5 Run full gates and update docs.

## Acceptance criteria

- 3MF writes only valid triangles and reports the emitted count.
- Quad meshes no longer lose a triangle.
- Non-triangulable input fails explicitly, never partially.
- `manifoldGuaranteed` never survives a topology-changing post-process.
- Existing triangular exports remain deterministic.
