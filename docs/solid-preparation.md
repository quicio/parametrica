# Solid preparation

Phase 5A adds explicit, non-destructive preparation for fabrication. It closes
open parametric meshes so they can pass the existing validation gate and become
STL bodies.

## Scope

Preparation is a **derived fabrication step**, not document editing:

- `view.fabrication = { weld, cap, tolerance, maxHoleEdges }`
- Off by default.
- Applied only to a copy of the candidate mesh inside Fabricate/STL export.
- Render geometry, layer geometry, SurfaceMapping, SVG/PNG and document layers
  are unchanged.

## Weld

`weldMesh(mesh, { tolerance })` merges vertices within the tolerance using a
deterministic spatial hash. Faces are remapped and faces that collapse below
three distinct vertices or zero area are removed. Normals and UVs are dropped
from the prepared copy because their vertex correspondence may change.

## Boundary loops and caps

`boundaryLoops(mesh)` walks directed open edges into ordered loops.

`capMesh(mesh, { maxHoleEdges })` fills each loop:

- a three-edge loop is closed with one reversed triangle;
- larger loops use a centroid fan with reversed boundary edges so the cap
  winding matches the surrounding mesh;
- loops larger than `maxHoleEdges` are skipped and reported.

Caps are fan triangulations, not minimal surfaces. A strongly non-planar hole
becomes a cone-like cap. That is enough to close a fabrication boundary, but it
is not a surface-reconstruction algorithm.

## Merge

`mergeMeshes(meshes, { weld })` concatenates vertices and faces with index
offsets and can weld the result. Disjoint closed shells remain valid inside one
mesh. Multi-body packing and export are later Phase 5 slices.

## Fabricate integration

Fabricate shows **Weld** and **Cap** toggles and a preparation row. When
preparation produces a valid body:

- the status becomes `READY · prepared closed body`;
- triangle/vertex/volume values come from the prepared mesh;
- the reason reads `Binary STL · millimetres · single body · prepared`;
- export uses the prepared mesh.

If preparation fails, export stays disabled and the validation checks explain
why. Preparation never runs when the toggles are off.

## Non-goals

- No CSG or boolean operations.
- No self-intersection detection or repair.
- No multi-body export.
- No automatic repair on export.
- No direct vertex/face editing.
