## Decisions

### D1: Parametric surface is a world generator

Add generator id `parametric-surface` with world expressions:

```txt
x = fx(u, v, time)
y = fy(u, v, time)
z = fz(u, v, time)
```

Parameters:

| Param | Meaning | Default |
|---|---|---|
| `exprX`, `exprY`, `exprZ` | surface equations | torus-like default |
| `u0`, `u1` | U domain | `0..2π` |
| `v0`, `v1` | V domain | `0..2π` |
| `samplesU` | grid rows | 64 |
| `samplesV` | grid columns | 32 |
| `closedU`, `closedV` | seam rules | true / true |
| `fit` | presentation fit | 340 |

The generator returns `Surface` with `points[u][v]` in world coordinates. It
does not read camera, projection, viewport or render state.

### D2: Surface grid and seam convention

- `samplesU` and `samplesV` are **cell counts**.
- When a dimension is closed, the sampled grid includes the duplicate seam
  sample: `points.length = uCells + 1` and each row length is `vCells + 1`.
- When a dimension is open, `points.length = uCells` and row length is
  `vCells`.
- `grid.rows` and `grid.cols` store the actual sampled row/column counts
  (including the seam sample when closed), because validation checks them
  against the concrete grid.
- `meta.cellsU`, `meta.cellsV`, `meta.closedU` and `meta.closedV` store the
  logical cell counts and seam flags used by tessellation and analysis.
- `domain.u` and `domain.v` store the original mathematical ranges.

This keeps the sampled grid rectangular while letting closed dimensions repeat
the seam row/column with coincident positions.

### D3: Deterministic tessellation

`Surface → Mesh`:

1. Drop the duplicated seam row/column for closed axes so the mesh topology is
   watertight.
2. Emit one vertex per unique grid sample.
3. Split each cell into two triangles with a stable diagonal
   `(u,v) → (u+1,v+1)`.
4. Wrap face indices to the first unique row/column at a closed seam instead of
   duplicating vertices.
5. Preserve consistent winding based on the U/V orientation.
6. Compute area-weighted vertex normals from face normals.
7. Emit face normals for flat display modes.

The tessellator is pure and deterministic: same surface and options produce
byte-equivalent mesh data except for generated ids. Seam welding keeps
`validateMesh` manifold/oriented checks green and avoids normal seams.

### D4: Surface area analysis

Add surface analysis:

- grid extent and bbox3;
- approximate surface area from tessellated triangles;
- closedU / closedV;
- optionally mean/max curvature later; not required by this slice.

Analysis runs on world `Surface`/`Mesh`, never on projected screen geometry.

### D5: RenderScene mesh items

Extend `RenderLayer` with projected triangle mesh items:

```js
{
  kind: 'mesh',
  vertices: [{ x, y, depth?, depthAlpha? }],
  faces: [[i, j, k], ...],
  normals: Vec3[],
  faceNormals: Vec3[],
  meta: { source, surfaceId, gridRows, gridCols, closedU, closedV }
}
```

Camera projection fills `x/y/depth/depthAlpha`; orthographic projection fills
`x/y` with `depthAlpha = 1`. The world mesh (`evaluation.meshes`) stays
camera-free; `evaluation.renderMeshes` and `RenderLayer.meshes` are projected.

### D6: p5 rendering without a z-buffer

p5 remains the backend. Surface rendering is supported with:

- `surface-fill`: painter-sorted triangle fills by average depth;
- `surface-wireframe`: projected mesh edges only;
- `stroke` continues to render curve polylines.

No depth buffer, clipping planes or lighting model are introduced. Painter
ordering is approximate and documented as such.

### D7: View projection

`view/projection.js` gains:

```txt
projectWorldMeshes(meshes, viewState) → projected Mesh[]
projectMesh(mesh, viewState) → projected Mesh
projectSurface(surface, viewState) → Surface   // passthrough placeholder
```

Projection:

- applies camera `project3D` or orthographic axes;
- keeps world identity in metadata;
- applies fit/centering to projected coordinates;
- never mutates the world surface or mesh.

Surfaces are tessellated before projection; `projectSurface` remains only for
callers that need the unchanged world grid.

### D8: Pipeline placement

```txt
Document
  → parametric-surface.generate()       Surface (world)
  → surface world operators (future)
  → validate / analyze                  Surface metrics
  → tessellate                          Mesh
  → project                             RenderScene triangles
  → p5 surface passes                   canvas
```

Sampling, tessellation and normals belong to geometry. Projection belongs to
view. Render passes do not compute surface mathematics.

### D9: Cache rules

- World Surface cache depends on generator params, seed, time, resolution,
  domains and closure flags; not camera/projection/fit/viewport.
- World surface analysis depends on Surface identity/version.
- Mesh cache depends on Surface identity and tessellation options.
- View/mesh projection depends on world mesh identity, camera/projection, fit
  and viewport.
- Render cache depends on the projected mesh scene and presentation settings.

Camera changes never re-tessellate the surface or regenerate its grid.

### D10: Document and compatibility

- No document v4.
- Existing documents and presets remain unchanged.
- Curves and surfaces coexist in the same RenderScene.
- Layer styles apply to surface fill/stroke where meaningful.
- Notebook checkpoints store the document as before; mesh data is derived.
- Existing 23 curve generators and 36 operators are unchanged.

## Risks

- Painter sorting is approximate; large intersecting surfaces may read wrong.
  Mitigate by documenting the limitation and keeping wireframe mode.
- Triangulation can change visual seams; test closed and open U/V grids.
- Seam welding changes vertex counts versus the sampled grid; test closed and
  open meshes for cracks and winding.
- Surface resolution can explode the point budget; enforce existing budgets and
  cap `samplesU * samplesV`.
- p5 fill performance may degrade with thousands of triangles; benchmark and
  batch by style.

## Alternatives rejected

- **Use Three.js now.** Rejected: no need for this slice; p5 can render
  wireframe and painter-sorted triangles.
- **Store tessellated meshes in the document.** Rejected: derived geometry must
  be recomputed.
- **Skewed per-cell vertices without seam convention.** Rejected: produces
  cracks and inconsistent normals.
- **Add z-buffer/lighting immediately.** Rejected: separate concern and much
  larger renderer change.
