# Advanced repair

Phase 5E adds an explicit, non-destructive repair step for fabrication meshes.
It fixes common blockers and reports every action.

## API

```js
repairMesh(mesh, {
  tolerance = 1e-4,
  maxHoleEdges = 256,
  capStrategy = 'auto', // auto | fan | planar | none
  orient = true,
})
```

Returns `{ mesh, validation, report }`. The input is never mutated; if nothing
changes, the original mesh is returned.

## Pipeline

```text
cleanup -> weld -> duplicate/degenerate removal -> cap -> orientation -> validate
```

### Cleanup

- Invalid faces: bad indices, fewer than three vertices, repeated vertices.
- Degenerate faces below the area tolerance.
- Duplicate faces:
  - same orientation: keep one;
  - opposite orientation: cancel both.

### Weld

Coincident vertices within tolerance are merged. Welding invalidates normals and
UVs, so the repaired copy drops them; fabrication does not need render
attributes.

### Orientation

For every edge shared by exactly two faces:

- same traversal direction means one face must flip;
- opposite direction means the faces are consistent.

A BFS assigns flip bits per connected component. Contradictions and
non-manifold edges are reported and are not repaired.

After consistency is established, edge-connected closed shells are checked by
signed volume. Negative-volume shells are flipped so outward orientation is
restored. Small/zero-volume closed shells are reported.

### Caps

- `fan`: centroid fan; works for strongly non-planar loops.
- `planar`: project the loop to its best-fit plane (Newell normal), run ear
  clipping, and add the triangles. No centroid vertex.
- `auto`: planar when the loop's maximum distance to its plane is within
  `max(tolerance × 10, loop diagonal × 1e-4)`; otherwise fan.
- `none`: do not cap.

If planar projection or ear clipping fails, repair falls back to fan and
reports `fallbackCaps`. Loops above `maxHoleEdges` are skipped and reported;
validation reflects the remaining boundary. Orientation repair runs after
capping, so cap winding is normalized globally.

## Report

```js
{
  strategy,
  changed,
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
  errors,
}
```

## Fabricate integration

`view.fabrication.repair` (default `false`) and
`view.fabrication.capStrategy` (default `auto`).

When repair is enabled:

- each candidate mesh runs through `repairMesh` instead of the 5A
  `prepareMesh` path;
- weld/cap toggles are disabled because repair includes them;
- the panel shows **Repair report** actions;
- status reads `READY · repaired closed body`;
- the reason says `repaired`.

Repair is derived only. Render geometry, layers, SurfaceMapping, SVG/PNG and
booleans are unchanged. If repair cannot produce a valid body, export remains
disabled with the remaining validation errors.

## Limits

- Does not repair self-intersections.
- Does not repair non-manifold edges or non-orientable surfaces.
- Planar caps require a simple projected loop; otherwise fall back to fan.
- Aggressive cleanup can remove very small intentional faces; tolerance is
  explicit and configurable.
