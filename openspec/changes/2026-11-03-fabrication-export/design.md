## Context

`geometryExport.js` defines `GeometryExporter` and `validateForFabrication`, but
no concrete exporter. `validateMesh`/`validateSolid` already detect open and
non-manifold meshes; self-intersection checks are not yet implemented.

## Decisions

### D1: Binary STL first

Implement binary STL for one validated Mesh/Solid. ASCII STL and 3MF are later.
Binary STL is compact, deterministic and sufficient for external slicer tests.

### D2: Validation gate

`validateForFabrication` must pass before any bytes are produced. Open,
non-manifold, inconsistently oriented or degenerate geometry is rejected.
Self-intersection remains a documented warning/limitation until the validator
supports it.

### D3: Units

Require physical `mmPerWorldUnit` from Phase 4B. Scale vertices only at export;
do not mutate world geometry. If units are absent, reject or mark unitless
according to the physical-units spec. STL itself has no unit field; document
the selected unit in export metadata/UI.

### D4: Determinism

Facet order follows mesh face order; normals are derived from the validated
face winding; non-finite values are rejected. Repeated export of the same
document/scale produces byte-identical output.

### D5: Single body

Export one Mesh/Solid per operation. Multi-body packing and 3MF are deferred.

## Risks / Trade-offs

- STL has no units; unit claims live outside the file.
- No self-intersection check yet; may pass meshes that some slicers reject.
- No repair; users must fix source geometry or wait for solid foundations.
- Binary STL only.
