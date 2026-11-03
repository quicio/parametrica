## Context

`ViewTransform` maps world → artboard; `SurfaceMapping` preserves logical cells
and real per-corner UVs; `Projection Source` can preserve world identity and
orthographic depth. The renderer uses painter ordering, which is unsuitable for
selection.

## Decisions

### D1: Pure picking infrastructure

`interaction/ray.js` owns cursor conversion, ray construction and triangle
intersection. `interaction/surfacePicker.js` owns world hits, occlusion and
mapping UV resolution. Neither imports p5 or DOM.

### D2: Ray math

Perspective inverts the existing `project3D` yaw/pitch rotation, with the
camera eye at `(0,0,-fov)` in camera space. Orthographic rays are parallel to
the implied panel eye (+Z/+Y/+X) and start outside world bounds on the positive
axis. Artboard conversion uses the same `artboardRect` produced by the renderer.

### D3: World intersection and occlusion

Picking intersects canonical world triangles with double-sided Möller–Trumbore.
Degenerate triangles are skipped. The nearest world ray parameter wins across
all visible surface meshes/layers; painter order is never consulted.
Transparency is not modeled; all visible surface triangles are treated as
pickable.

### D4: UV and XYZ

World barycentric coordinates come directly from the intersection. UV is
interpolated from `SurfaceMapping.faces[faceIndex].uv`; no `Mesh.uvs`, no
faceIndex→cell inference, no normalized UVs. Missing or mismatched mappings
produce an explicit status and null UV. World barycentric interpolation is
perspective-correct by construction.

### D5: Result contract

`SurfacePickResult` is a derived, camera-dependent result containing layer,
mesh, surface, face, triangle indices, barycentric, world point, UV, cell,
mapping status, distance and orthographic depth. It is not persisted and is
invalidated by camera or geometry changes.

### D6: UI

`SurfaceInspector` is read-only, bottom-left, toggled from Canvas. It updates on
hover, camera/zoom changes and re-evaluation when not dragging or playing.
Quad shows `Single view only`. It is excluded from captures and exports.

### D7: Performance

Picking is a linear scan over inspectable surface triangles. No BVH is added
before measuring. The normal render path does not perform picking. The picker
uses existing evaluation meshes/mappings and does not retain references across
evaluations.

## Risks / Trade-offs

- Linear scan O(triangles) per hover; large meshes may need acceleration later.
- Transparency is not represented in occlusion.
- Composition-mode layers have independent frames; picking compares world
  distances from per-layer rays.
- Camera changes during drag skip inspection until release.
- Near-plane clipped triangles are not reconstructed.
- Surface inspector is single-Canvas only.

## Open Questions

- When is a BVH or surface index justified?
- Should transparency affect pickability?
- Should Quad reuse a shared panel layout helper?
- Should hover results be cached per camera/evaluation?
