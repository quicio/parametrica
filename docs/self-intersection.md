# Self-intersection diagnostics

Phase 5B adds deterministic triangle self-intersection checks to mesh and solid
validation. Fabrication rejects folded meshes instead of reporting the old
"not implemented" limitation.

## Algorithm

- **Broad phase:** a bounding-volume hierarchy (BVH) split by the longest bbox
  axis, then by centroid with face-index tie-breaking.
- **Narrow phase:** separated-plane interval tests, with a 2D coplanar fallback
  for edge crossings and containment.
- **Adjacency:** triangles that share a spatial vertex within tolerance are
  skipped, covering welded seams and tessellation neighbours.
- **Tolerance:** derived from the mesh bbox diagonal (`diagonal × 1e-9`), with
  an absolute floor of `1e-9`. The result records the tolerance used.

The detector returns:

```js
{
  supported: true,
  checked: true,
  count: 3,
  pairs: [{ a: 12, b: 87 }, ...],
  truncated: false,
  tolerance: 1.2e-8,
}
```

## Validation

`validateMesh` stores the result in `meta.selfIntersections`. Any reported pair
adds a `N self-intersecting triangle pairs` error, so:

- `meshToSolid` refuses promotion;
- Fabricate shows `NOT FABRICABLE`;
- STL export is rejected before bytes are written.

No vertices or faces are moved. Repair remains out of scope.

## Reporting limits

- Pairs are capped at 32 by default; `truncated` records that more exist.
- The reported count is the collected pair count, not an exhaustive count.
- A genuine intersection that only touches at a shared vertex is not reported.
- Near-coplanar intersections within tolerance may be missed.

## UI

Fabricate shows validation errors alongside warnings. A self-intersecting
source displays the pair count in **Checks** and prioritises the
self-intersection error in the reason line.
