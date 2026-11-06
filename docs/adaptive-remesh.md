# Feature-preserving remesh

Remesh is the robust fallback for self-intersections and non-convex CSG. This
slice improves fidelity by projecting generated vertices onto the source surface
and snapping near sharp feature edges.

## Feature edges

For every source edge shared by two faces, the dihedral angle is computed from
face normals. Edges above `featureAngle` (default 40°) become feature segments.
Smooth surfaces produce no feature edges.

## Projection

For each generated vertex:

1. Query the source triangle BVH for the closest surface point.
2. Query feature segments for the closest edge point.
3. Prefer the feature point when it is within `cell × featureSnap` of the
   surface point.
4. Move the vertex to the selected point.

Topology is unchanged; only vertex positions move. The mesh is then welded,
oriented, topology-repaired and validated.

## Options

```js
remesh(inputs, {
  project: true,        // default
  featureAngle: 40,     // degrees
  featureSnap: 2,       // grid cells
})
```

`project: false` reproduces the raw grid iso-surface.

## Results

- Cube: sharp edges detected, volume within 1.25%.
- Torus: projected volume is closer to the analytic source volume than raw
  remesh.
- CSG and self-intersection fallbacks report `projected` and `featureEdges`.
- Output remains deterministic and validates.

## Limits

- Projection improves vertex placement but does not guarantee exact feature
  reconstruction.
- No octree/dual-contouring rewrite yet.
- Very thin features can still be lost at low resolution.
