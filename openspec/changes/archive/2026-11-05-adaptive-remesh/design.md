## Context

`remesh` samples a grid and extracts marching-tetrahedra geometry. Vertices lie
on grid edges, so sharp features are rounded and volume is biased. A post-pass
can move vertices onto the source surface without changing connectivity.

## Decisions

### D1: Feature edges

For each source edge shared by two faces, compute the dihedral angle from face
normals. Edges above `featureAngle` (default 40°) are collected as feature
segments.

### D2: Surface projection

For each generated vertex:

1. Query a triangle BVH for the closest point on any source mesh.
2. Query feature segments for the closest point on a sharp edge.
3. Prefer the feature point when it is within `cell × featureSnap` of the
   surface point.
4. Move the vertex to the selected point.

Projection only changes vertex positions; faces and topology stay the same.
The mesh is welded, repaired and validated afterwards.

### D3: Determinism

- BVH and feature-edge order are deterministic.
- Closest-point ties keep the first candidate in stable order.
- Projection and snapping use no randomness.

### D4: Defaults

`project = true`, `featureAngle = 40`, `featureSnap = 2`. Callers can disable
projection for raw grid behavior.

## Test matrix

- Cube remesh: volume close to 8, feature edges detected, deterministic.
- Torus and overlapping-tori remesh: volume improves or stays within tolerance.
- Projection disabled reproduces the previous grid behavior.
- Every projected result validates and has no self-intersections.
- CSG/self-intersection fallback stats report projection and feature counts.
