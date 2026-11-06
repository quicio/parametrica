## 1. 3MF triangulation

- [ ] 1.1 Define deterministic triangulation for faces with more than 3 vertices.
- [ ] 1.2 Reject non-planar or non-simple faces with a structured error.
- [ ] 1.3 Preserve winding and source geometry.
- [ ] 1.4 Count emitted triangles in the export result.
- [ ] 1.5 Add quad, fan and rejection tests.

## 2. Trust lifecycle

- [ ] 2.1 Define which post-processes clear `manifoldGuaranteed`.
- [ ] 2.2 Clear the flag at the post-process boundary.
- [ ] 2.3 Ensure validation never upgrades trust.
- [ ] 2.4 Record trust in the final report/provenance.
- [ ] 2.5 Add lifecycle tests for repair, caps, orientation and lattice.

## 3. Regression

- [ ] 3.1 Confirm triangular meshes export identically.
- [ ] 3.2 Confirm quad meshes emit complete triangle lists.
- [ ] 3.3 Confirm deterministic bytes.
- [ ] 3.4 Confirm existing 3MF validation gate is unchanged.
- [ ] 3.5 Run full gates and update docs.

## Acceptance criteria

- 3MF writes only valid triangles and reports the emitted count.
- Quad meshes no longer lose a triangle.
- Non-triangulable input fails explicitly, never partially.
- `manifoldGuaranteed` never survives a topology-changing post-process.
- Existing triangular exports remain deterministic.
