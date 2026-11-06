## Context

5A provides weld and centroid-fan caps. 5B rejects self-intersections. 5C–5D
select and combine validated bodies. Orientation errors, duplicate faces and
non-planar holes still reach validation and block export.

## Decisions

### D1: Pure repair API

Add `src/geometry/repair.js`:

```js
repairMesh(mesh, {
  tolerance = 1e-4,
  maxHoleEdges = 256,
  capStrategy = 'auto', // auto | fan | planar | none
  orient = true,
})
```

Return:

```js
{
  mesh,
  validation,
  report: {
    changed: boolean,
    removedInvalidFaces,
    removedDegenerateFaces,
    removedDuplicateFaces,
    weldedVertices,
    cappedLoops,
    planarCaps,
    fanCaps,
    fallbackCaps,
    skippedLoops,
    flippedFaces,
    flippedShells,
    orientationContradictions,
    warnings,
  }
}
```

Inputs are never mutated. `mesh` is always a new Mesh or the input when no
change is needed.

### D2: Cleanup

1. Drop faces with invalid indices, fewer than three vertices or repeated
   vertices.
2. Weld vertices with the preparation tolerance.
3. Drop degenerate faces below the area tolerance.
4. Remove duplicate faces:
   - same orientation: keep one;
   - opposite orientation: cancel both.
5. Report every removal.

### D3: Orientation repair

Build an undirected edge map. For each edge shared by exactly two faces:

- same direction: one face must be flipped relative to the other;
- opposite direction: no flip relation.

BFS assigns a flip bit to each connected component. A contradiction leaves the
mesh inconsistent and is reported. After applying flips, find edge-connected
shells and compute signed volume per shell. Flip closed shells with negative
volume so outward orientation is restored.

Non-manifold edges are not repaired; they are reported and validation still
fails.

### D4: Cap strategies

Boundary loops come from `boundaryLoops`.

- `fan`: centroid fan; deterministic and works for strongly non-planar loops.
- `planar`: project the loop onto its best-fit plane (Newell normal), run ear
  clipping, and add the resulting triangles. If projection or ear clipping
  fails, fall back to fan and report `fallbackCaps`.
- `auto`: use planar when the maximum vertex distance to the best-fit plane is
  within tolerance; otherwise fan.
- `none`: do not cap.

Loops larger than `maxHoleEdges` are skipped and reported. Orientation is
repaired after capping, so cap triangles do not need to guess winding.

Ear clipping is intentionally simple: simple projected polygons only. Complex
or self-intersecting projections fall back to fan.

### D5: Order of operations

```text
cleanup -> weld -> degenerate/duplicate removal -> cap -> orientation -> validate
```

A final validation runs `validateMesh`, including self-intersection checks.
Repair never removes self-intersections.

### D6: Fabrication integration

Add:

```js
view.fabrication.repair = false;
view.fabrication.capStrategy = 'auto';
```

When `repair` is true, each candidate mesh runs through `repairMesh` instead of
the 5A `prepareMesh` path. Weld and cap toggles are disabled in the UI because
repair includes them. Repair is off by default, so existing behavior is
unchanged.

The report exposes repair actions. Empty/failed repair keeps export disabled
with validation reasons. The repair is derived only; render meshes, layers,
SurfaceMapping, SVG/PNG and booleans are unchanged.

## Risks / Trade-offs

- Orientation propagation cannot fix non-orientable or non-manifold meshes.
- Planar caps are limited to simple projected loops.
- Aggressive cleanup can remove tiny intentional faces; tolerance is explicit.
- Repair does not fix self-intersections; that remains a validation failure.
