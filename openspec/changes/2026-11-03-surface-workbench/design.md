## Context

The pipeline already separates world and view spaces, but the surface path
short-circuits operators. World transform operators are curve-only. Surfaces
and their meshes are derived and immutable after evaluation; SurfaceMapping is
generated during tessellation.

## Decisions

### D1: Operators declare spatial acceptance

Operators that can act on spatial geometry declare `accepts/produces` including
`surface`, `mesh` and/or `solid` and `space: 'world'`. Unsupported kinds produce
a keyed stage error before mutation.

### D2: Surface operator stage

For a surface document, world operators run on Surface/Mesh geometry before
tessellation. The engine must not project or tessellate between world
operators. Validation runs after each stage.

### D3: Minimum operator set

Phase 4A implements transform (translate/rotate/scale), mirror and repeat/array
for Surface/Mesh. Each operator must define its world semantics and preserve
finite coordinates. Deform/trim/offset are deferred.

### D4: Mapping lifecycle

If an operator transforms vertices without changing grid topology, the existing
SurfaceMapping domain/cells/UVs remain valid; world overlays and picking use the
new vertices. If topology/grid size changes, mapping is invalidated and
regenerated from the resulting Surface. Operators that cannot guarantee a valid
grid must return Mesh (not Surface) or an explicit error.

### D5: Cache boundaries

World surface/operator results are cached independently from tessellation,
projection and render. Camera/view changes never invalidate world operators.
Mapping and mesh caches invalidate together with the resulting Surface.

### D6: UI

The existing operator stack is reused. Operators appear only when their
declared geometry acceptance matches the active surface. No separate modeling
workspace is added.

## Risks / Trade-offs

- Surface operators can produce self-intersections or open boundaries; these are
  reported, not repaired.
- Some operators may only support Mesh, not Surface.
- Typed errors must not leave partial geometry.
- Existing curve operator order and behavior must remain unchanged.

## Open Questions

- Should repeat/array of surfaces emit one Mesh or multiple Surfaces?
- Which deform operators are safe for rectangular Surface grids?
- Should transformed surfaces keep the same id or receive a derived id?
