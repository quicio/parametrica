# Mesh topology repair

Phase 6B adds explicit repair for non-manifold edges and non-orientable
topology. Geometry positions never change; only topology is split or cut.

## Non-manifold edges

For an edge shared by more than two faces:

1. Incident faces are grouped by their manifold component using the other
   edges of the mesh.
2. Extra components receive duplicated edge vertices.
3. The component's faces are reassigned to the duplicates.
4. The edge budget is enforced (`maxEdges`).

`split` preserves geometry and produces separate manifold components.
`remove` drops extra fan faces and reports the removal. `none` leaves the mesh
untouched.

## Non-orientable topology

Orientation constraints are propagated across manifold edges. A contradiction
identifies a non-orientable cycle.

- `cut`: duplicate the conflicting seam edge and reassign one incident face,
  producing an orientable open patch. The patch can then be capped.
- `reject`: report `non-orientable` and return no geometry.

A closed non-orientable surface cannot be embedded as a single orientable shell
in 3D. It is rejected rather than falsely marked closed.

## Integration

Topology repair runs before orientation and caps inside Repair:

```text
cleanup -> topology -> caps -> orientation -> validate
```

Fabricate exposes:
- `view.fabrication.topology`: `none | split | remove`
- `view.fabrication.nonOrientable`: `cut | reject`

The repair report shows non-manifold edges, split edges, duplicated vertices,
seam cuts, removed faces and remaining conflicts.

## Limits

- Non-manifold edges that belong to one connected component fall back to
  deterministic angular fan pairing.
- Non-orientable repair does not thicken/solidify surfaces.
- Self-intersection repair and CSG are separate steps.
