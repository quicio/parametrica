## Context

`validateMesh` checks indices, degenerate faces, open boundaries, non-manifold
edges, orientation and signed volume. It currently pushes a fixed warning:
`self-intersection validation not implemented`.

## Decisions

### D1: BVH broad phase

Triangles are indexed in a deterministic bounding-volume hierarchy split by
the longest bbox axis, then by centroid with index tie-breaking. Each triangle
queries candidates with a higher index, so each pair is tested once.

### D2: Triangle-triangle test

The narrow phase follows the separated-plane interval test:

1. Reject when all vertices of one triangle lie strictly on one side of the
   other triangle's plane.
2. Handle coplanar triangles with 2D edge intersection and point-in-triangle.
3. Otherwise project both plane-intersection segments onto the intersection
   line and test interval overlap.

A tolerance derived from the mesh bbox diagonal is used consistently for plane
distance, AABB overlap and spatial vertex sharing.

### D3: Adjacency exclusion

Two triangles that share a spatial vertex within tolerance are skipped. This
avoids false positives from tessellation seams and welded adjacency. The
trade-off is documented: a genuine self-intersection that only touches at a
shared vertex is not reported.

### D4: Reporting

`detectSelfIntersections` returns:

```js
{
  supported: true,
  checked: true,
  count,
  pairs: [{ a: faceIndex, b: faceIndex }],
  truncated,
}
```

Pairs are capped (default 32) so validation remains bounded on pathological
meshes. `truncated` records when more pairs exist.

### D5: Validation and export

`validateMesh` stores the result in `meta.selfIntersections`. Any reported pair
adds an error, so `validateSolid`, Fabricate and STL export reject the mesh.
No repair is attempted.

## Risks / Trade-offs

- Exact coplanar overlap is the hardest case; a small tolerance can miss
  near-coplanar intersections.
- Shared-vertex exclusion can hide vertex-only contacts.
- Very large meshes trade exact pair counts for a bounded report.
