## Context

`validateMesh` already detects open boundaries, non-manifold edges,
inconsistent orientation and degenerate faces. `meshToSolid` promotes only a
validated closed mesh. The fabrication source currently rejects open meshes and
never repairs them.

## Decisions

### D1: Explicit, derived preparation

Preparation is a document view setting:

```js
view.fabrication = {
  weld: false,
  cap: false,
  tolerance: 1e-6,
  maxHoleEdges: 256,
}
```

It is off by default. When enabled, `resolveFabricationSource` builds a
prepared copy of candidate meshes. Layer geometry, render meshes and
SurfaceMapping are untouched.

### D2: Weld

Weld merges vertices within a spatial-hash tolerance, remaps faces and drops
faces that collapse to fewer than three distinct vertices or zero area. Welding
invalidates normals/UVs, so the prepared mesh drops them; fabrication does not
need render attributes.

### D3: Boundary loops and caps

Open boundary edges are walked into directed loops. A three-edge loop is closed
with one reversed triangle. Larger loops use a deterministic centroid fan,
reversing each boundary edge so the cap orientation matches the existing mesh.
Loops larger than `maxHoleEdges` are skipped and reported.

Caps are fan triangulations, not minimal surfaces. This is documented: a
non-planar hole becomes a cone-like cap, which is acceptable for closing
fabrication boundaries but is not a surface-reconstruction feature.

### D4: Merge

`mergeMeshes` concatenates vertices/faces with index offsets and optionally
welds the result. Separate closed shells remain valid and are reported as one
mesh with multiple shells. Multi-body packaging and export are later slices.

### D5: Validation and export

Preparation never bypasses validation. The prepared mesh runs through
`validateMesh`; Fabricate and STL export require the prepared result to be
closed, manifold, oriented, non-degenerate and non-zero volume. If preparation
cannot produce a valid body, export stays disabled and the reason is shown.

Preparation is not persisted as geometry. It is reproducible from the document
view settings plus the evaluated mesh.

## Risks / Trade-offs

- Fan caps can create long thin triangles on curved holes.
- Welding with an aggressive tolerance can collapse intended detail; the
  default is conservative and configurable.
- Preparation adds work only when enabled; render paths are unaffected.
