## Context

`detectSelfIntersections` returns bounded face-index pairs. `repairMesh` fixes
orientation, duplicates, degenerates and caps, but leaves intersecting faces
untouched. A repair strategy must either resolve the intersections locally or
produce a new watertight approximation.

## Decisions

### D1: API

Extend repair:

```js
repairMesh(mesh, {
  ...,
  selfIntersections: 'none' | 'split' | 'remesh' | 'auto',
  maxIntersectionPairs = 256,
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

### D2: Split strategy

For each detected intersecting pair:

1. Compute the exact triangle-triangle intersection segment.
2. Split both triangles along the segment into sub-triangles.
3. Classify each fragment with a generalized winding number against the
   original closed mesh.
4. Keep the fragments that belong to the outer boundary.
5. Rebuild, weld, resolve T-junctions and re-run orientation/cap repair.
6. Repeat up to `maxPasses = 3` while pairs remain and budget allows.

If pairs remain or the topology is not resolvable, return `invalid-result` with
the remaining count. No partial mesh is returned.

### D3: Remesh strategy

1. Compute the mesh world bbox.
2. Build a deterministic grid at `remeshResolution` on the longest axis.
3. Evaluate a signed distance field using closest-triangle distance and
   ray-parity sign.
4. Extract an iso-surface (marching tetrahedra) with stable edge tables.
5. Weld, orient and validate the result.
6. Record resolution, triangle count and volume delta.

Remesh is approximate. It is intended for tangled meshes where local splitting
is not practical, not for preserving exact features.

### D4: Auto strategy

- `split` when pairs <= `maxIntersectionPairs` and the mesh is closed and
  manifold.
- `remesh` when pairs exceed the local budget or split failed.
- Report the actual strategy and fallback reason.

### D5: Validation and fabrication

Every result re-runs `validateMesh`, including self-intersection detection.
Fabricate requires closed, manifold, oriented, self-intersection-free,
positive-volume output. Empty/failed results disable export with a reason.

Self-intersection repair is derived for fabrication; render geometry is never
mutated.

### D6: UI

Under Repair, add **Self-intersections**: Off / Split / Remesh / Auto, plus a
budget/resolution display. The repair report shows strategy, remaining pairs,
fallbacks and volume/triangle delta.

## Test matrix

- Two crossed tetrahedra/cubes merged into one self-intersecting mesh:
  split repair yields a valid closed body with expected volume.
- Enneper preset (self-intersecting surface): split or remesh yields a valid
  body; remesh volume within 3% of the source volume estimate.
- Clean mesh: no change.
- Pair budget exceeded: auto falls back to remesh; split returns structured
  failure.
- Remesh budget exceeded: structured `complexity`.
- Determinism: geometry and STL bytes repeated.
- Invalid result never reaches STL.
- E2E: repair off fails; split or remesh enables export; render unchanged.

## Risks / Trade-offs

- Local splitting is complex and can fail on overlapping coplanar regions.
- Winding classification is sensitive to tolerances.
- Remesh loses sharp features and small details.
- High resolutions are expensive; budgets are mandatory.
