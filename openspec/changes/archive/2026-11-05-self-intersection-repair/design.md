## Context

`detectSelfIntersections` returns bounded face-index pairs. `repairMesh` fixes
orientation, duplicates, degenerates and caps, but leaves intersecting faces
untouched. A repair strategy must either resolve the intersections locally or
produce a new watertight approximation.

## Decisions

### D1: API

Extend repair:

```js
repairSelfIntersections(mesh, {
  ...,
  strategy: 'none' | 'remesh' | 'auto',
  remeshResolution = 64,
  maxRemeshTriangles = 250_000,
})
```

Default `none` preserves Phase 5E behavior.

Return report additions:

```js
{
  selfIntersectionStrategy,
  selfIntersectionPairs,
  splitFaces,
  remeshFallback,
  remeshResolution,
  volumeDelta,
  triangleDelta,
}
```

### D2: Remesh strategy

1. Compute the mesh world bbox.
2. Build a deterministic grid at `remeshResolution` on the longest axis.
3. Evaluate a signed distance field using closest-triangle distance and
   ray-parity sign.
4. Extract an iso-surface (marching tetrahedra) with stable edge tables.
5. Weld, orient and validate the result.
6. Record resolution, triangle count and volume delta.

Remesh is approximate. It is intended for tangled meshes where local splitting
is not practical, not for preserving exact features.

### D3: Auto strategy

- `none` reports pairs without changing geometry.
- `remesh` runs the deterministic signed-distance remesher.
- `auto` currently selects remesh when pairs exist; the report names the actual
  strategy. Exact local splitting remains a future strategy.

### D4: Validation and fabrication

Every result re-runs `validateMesh`, including self-intersection detection.
Fabricate requires closed, manifold, oriented, self-intersection-free,
positive-volume output. Empty/failed results disable export with a reason.

Self-intersection repair is derived for fabrication; render geometry is never
mutated.

### D5: UI

Under Repair, add **Self-intersections**: Off / Remesh / Auto, plus a resolution
input. The repair report shows strategy, pairs, resolution and volume/triangle
delta.

## Test matrix

- Two crossed tetrahedra/cubes merged into one self-intersecting mesh:
  remesh yields a valid closed body.
- Enneper preset (self-intersecting surface): remesh yields a valid body.
- Clean mesh: no change.
- Pair budget/strategy none: no geometry change and pairs are reported.
- Remesh budget exceeded: structured `complexity`.
- Determinism: geometry and STL bytes repeated.
- Invalid result never reaches STL.
- E2E: repair off fails; split or remesh enables export; render unchanged.

## Risks / Trade-offs

- Remesh loses sharp features and small details.
- Exact local splitting remains future work and is not promised.
- High resolutions are expensive; budgets are mandatory.
