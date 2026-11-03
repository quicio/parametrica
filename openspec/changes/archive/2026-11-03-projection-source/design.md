## Context

`projectMeshToView` maps mesh vertices to `{x,y,depth,depthAlpha}`. In
perspective, `depth` is normalized view depth; in orthographic, all vertices
get `depth = 0`. World coordinates and the dropped orthographic axis are lost.
`SurfaceMapping` references source mesh vertex indices, so a future consumer
needs an explicit bridge back to those vertices and to real depth.

## Decisions

### D1: Opt-in source sidecar

`projectMeshToView`, `projectWorldMeshesToView`, `projectWorldMeshes` and
`projectMesh` accept `preserveSource: false` by default. When true, the
projected mesh gains a top-level `source` object. The normal render path does
not request it and pays no source allocation.

### D2: Contract

```text
mesh-projection-source {
  kind,
  view,
  sourceMeshId,
  sourceVertices,       // alias, not a copy
  sourceIndices,        // explicit identity, currently 0..n-1
  sourceVertexCount,
  orthoDepth: null | { axis, sign, values }
}
```

`sourceVertices` aliases the canonical world mesh. Ownership stays with the
source mesh; mutation after evaluation is unsupported.

### D3: Orthographic depth

The dropped world coordinate is preserved with an implied eye on the positive
axis:

- XY: `orthoDepth = -z` (eye +Z)
- XZ: `orthoDepth = -y` (eye +Y)
- YZ: `orthoDepth = -x` (eye +X)

Larger values are farther from the implied viewer. The existing per-vertex
`depth` remains 0 in orthographic views so painter ordering is unchanged.
Perspective keeps per-vertex normalized `depth`; `orthoDepth` is null.

### D4: Lifecycle and caching

The source is derived on demand; no global cache is introduced. If a consumer
caches projected meshes, `preserveSource` must be part of the cache signature.
Re-projection without `preserveSource` strips any pre-existing `source` to
avoid stale aliases.

### D5: Mapping compatibility

`SurfaceMapping.meshId` and `source.sourceMeshId` identify the same mesh.
Mapping face indices refer to source vertex identities; projected faces keep
their indices. No SurfaceMapping semantics change.

### D6: Rendering and export

Projected vertices, faces, depth and depthAlpha are identical with or without
the sidecar. RenderScene, passes, SVG, plotter, PNG and GIF do not consume it.

## Risks / Trade-offs

- `sourceIndices` and orthographic `values` are O(n) allocations when opted in.
- `sourceVertices` is an alias; the source mesh must remain alive and immutable.
- The implied orthographic eye/sign is a convention; future picking must use it
  consistently.
- No RenderScene exposure yet; a future consumer must request or attach it.
- Near-plane null vertices still exist in perspective meshes.

## Open Questions

- Should future scene building request source only for the active surface?
- Should `sourceIndices` use a typed array for large meshes?
- When should orthographic depth become the render depth for picking?
