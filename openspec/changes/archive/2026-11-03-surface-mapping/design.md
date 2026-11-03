## Context

`Surface.domain` is authoritative, but `tessellateSurface` welds closed axes
and flips opposite coordinates for reverse seams. A welded vertex can represent
multiple UVs. `Mesh.uvs` is per-vertex and unused; `mesh.meta` has topology
flags but not real domain endpoints or per-face cells.

## Decisions

### D1: One logical-cell loop

An internal `buildSurfaceTessellation` produces mesh and mapping in the same
nested U/V loop. The mapping cannot drift from the face order or corner
indices.

### D2: Mapping contract

`SurfaceMapping` stores:

- `surfaceId`, `meshId`;
- real `u0/u1`, `v0/v1`;
- `closedU/V`, `seamU/V`, `twistU/V`;
- unique grid rows/cols and logical `uCells/vCells`;
- per-face `indices`, `cell {u,v}`, `triangle` and `uv[3]`.

UVs use real domain values and are computed from logical coordinates before
wrap/flip. Closed seams therefore keep the `u1`/`v1` corner even when the
vertex index wraps to the first row/column.

### D3: Storage

- `tessellateSurfaceWithMapping(surface)` returns `{ mesh, mapping }`.
- `tessellateSurface(surface)` remains the compatibility wrapper returning the
  mesh.
- The engine caches `{ meshes, surfaceMappings }` in the existing mesh cache.
- `evaluation.surfaceMappings` and `layer.surfaceMappings` expose the sidecar.
- Mapping is not stored in `Mesh.meta` and is not added to RenderScene.

### D4: Invalidation

The mapping lifetime is the mesh entry lifetime. Surface re-evaluation creates
a new Surface array, mesh cache entry and mapping. Topology changes create a
new mapping. In-place mutation of a Surface after evaluation is unsupported.

### D5: Validity

Invalid surfaces fail through `validateSurface`/tessellation as before.
Non-finite domain values fail explicitly in mapping domain extraction.
Zero-span domains are represented as finite duplicate UVs rather than silently
invented ranges.

## Risks / Trade-offs

- Mapping memory grows with triangle count (three UV objects per triangle).
- Consumers must use per-corner UVs, not `Mesh.uvs`.
- The mapping is not serialized or exposed to RenderScene yet.
- Future surface operators must regenerate mapping with topology.
- Vertex world coordinates and orthographic depth remain future Phase 3B work.

## Open Questions

- Should mapping be keyed by `surfaceId` in a Map when duplicate ids appear?
- Should forward mapping include world positions for direct XYZ interpolation?
- When should RenderScene carry a mapping reference for interaction?
