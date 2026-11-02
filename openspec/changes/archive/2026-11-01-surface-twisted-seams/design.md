## Context

See `proposal.md` - Why. The surface generator samples both endpoints, the
tessellator welds closed axes by index, and `engine.js` derives wireframe
compatibility curves from the projected mesh. The Möbius preset is the first
surface whose closed U seam must be identified with a V reversal rather than
an index-to-index wrap.

## Goals / Non-Goals

**Goals:**

- Weld a closed seam whose opposite coordinate is mirrored, with shared
  vertices and no duplicated boundary.
- Keep normal closed seams and open patches byte-equivalent.
- Keep seam metadata available to wireframe, SVG and future consumers.
- Keep the document format unchanged; seam modes are normal generator params.

**Non-Goals:**

- A general non-orientable topology solver or Klein-bottle preset.
- Reparing arbitrary user expressions with mismatched seam endpoints.
- Filled/shaded previews or a new renderer.

## Decisions

### D1: Seam modes are generator parameters

Add two independent advanced selects:

```txt
seamU: 'normal' | 'reverse'   default: 'normal'
seamV: 'normal' | 'reverse'   default: 'normal'
```

`reverse` is only meaningful when the corresponding `closedU`/`closedV` is
true; otherwise the seam is open and the mode is ignored with a validation
warning. The modes are stored in both `domain` and `meta` so geometry
consumers do not depend on generator params.

Existing documents without these fields sanitize to `normal`.

Alternative rejected: infer a reversed seam automatically from coincident
endpoints. Coincidence can be accidental, and the user's intent belongs in the
document.

### D2: Welded corner mapping

For unique grid dimensions `R × C` and cell counts `uCells`/`vCells`, the four
corners of cell `(u, v)` are resolved by a wrap helper:

```txt
wrap(i, size, twist) =
  i in [0, size) ? { index: i, flip: false }
                  : { index: ((i % size) + size) % size, flip: twist }

corner(u, v):
  cu = wrap(u, R, twistU)
  cv = wrap(v, C, twistV)
  ui = cu.index; vi = cv.index
  if cu.flip: vi = C - 1 - vi
  if cv.flip: ui = R - 1 - ui
  return indexOf(ui, vi)

twistU = closedU && seamU == 'reverse'
twistV = closedV && seamV == 'reverse'
```

A cell emits the two triangles `(a,b,c)` and `(a,c,d)` with
`a=corner(u,v)`, `b=corner(u+1,v)`, `c=corner(u+1,v+1)`, `d=corner(u,v+1)`.
For the Möbius U seam this maps the last row at `v` to the first row at
`C-1-v`, so seam vertices are shared and no boundary is duplicated.

When both axes are twisted the two flips compose at the corner; the mapping is
well-defined but no built-in preset uses it yet.

### D3: Mesh metadata

`createMesh` receives:

```txt
meta: {
  source: 'surface-tessellation',
  surfaceId,
  uCells, vCells,
  closedU, closedV,
  seamU, seamV,
  twistU, twistV,
  gridRows, gridCols
}
```

`gridRows`/`gridCols` remain the unique welded dimensions. `twistU`/`twistV`
let wireframe and SVG consumers reconstruct the seam without reading the
document.

### D4: Twisted compatibility curves

`meshWireframeCurves` must not mark a twisted U isoline as simply closed: the
first and last vertices are not the same vertex. Instead it pairs the mirror
columns:

```txt
for v where v <= C-1-v:
  points = [ (u, v) for u in 0..R-1 ]
  if v != C-1-v: points += [ (u, C-1-v) for u in 0..R-1 ]
  curve.closed = true
```

The same pairing applies to V-direction curves when `twistV` is set. This
produces `ceil(C/2)` closed loops for the Möbius and avoids a false straight
line from the last vertex to the first. Normal seams keep their existing
closed/open behaviour.

### D5: Validation

`validateSurface` accepts the new seam fields and:

- errors on a value other than `normal` / `reverse`;
- warns when `reverse` is used on an open axis;
- warns when a reversed closed seam's sampled endpoints do not mirror within
  `1e-3` world units.

The warning is non-blocking; tessellation still uses the declared mapping so
the user can see and correct the expression.

### D6: Möbius preset

```txt
closedU = true
seamU = 'reverse'
closedV = false
samplesU = 64
samplesV = 16
```

The preset still samples the duplicate U seam row for validation and
reproducibility; the tessellator drops it and welds to the mirror row.

## Risks / Trade-offs

- **Non-orientable mesh** → the Möbius mesh is manifold but not globally
  oriented; `validateMesh` may report inconsistent orientation. That is
  mathematically expected and must not be treated as a crack.
- **Both-axis twist composition** → the corner mapping is defined but not
  covered by a preset; add a focused test if a future surface needs it.
- **Seam tolerance** → the 5-decimal parameter rounding makes the Möbius
  endpoints differ by ~1e-5; validation tolerates 1e-3.
- **Wireframe density** → paired loops traverse the band twice; the point
  budget still applies. The mesh `surface-wireframe` pass remains the exact
  edge rendering.
- **Backward compatibility** → old documents default to `normal`; normal
  closed seams and open patches are unchanged.

## Migration Plan

1. Existing documents gain `seamU`/`seamV` defaults through schema resolution;
   no storage migration is required.
2. The Möbius preset is updated in place; its preview key changes because the
   generator params change.
3. Rollback: remove the seam params; the generator falls back to `normal`.
