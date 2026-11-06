## Context

`validateMesh` reports open boundaries, non-manifold edges and inconsistent
orientation. `repairOrientation` can flip orientable components but cannot
resolve edges shared by more than two faces, and a non-orientable cycle has no
consistent two-sided orientation.

## Decisions

### D1: API

```js
repairTopology(mesh, {
  tolerance = 1e-4,
  nonManifold = 'split' | 'remove' | 'none',
  nonOrientable = 'cut' | 'reject',
  maxEdges = 4096,
})
```

Return `{ mesh, validation, report }`.

### D2: Non-manifold edges

For each edge with more than two incident faces:

1. Group incident faces into fans by angular order around the edge.
2. For each fan beyond the first, duplicate the edge endpoints.
3. Reassign the fan's faces to the duplicated vertices.
4. Keep geometry unchanged; only topology is split.
5. Report split edges, duplicated vertices and resulting shells.

If `nonManifold = 'remove'`, extra fan faces are removed instead and reported.
`none` leaves the mesh unchanged.

### D3: Non-orientable surfaces

Run orientation propagation (5E). A contradiction cycle identifies a
non-orientable path.

- `cut`: duplicate the seam edge vertices, assign one side of the cycle to the
  duplicates, and rebuild. The result is an orientable open patch.
- `reject`: report `non-orientable` and return no geometry.

A cut patch can then be capped by `repairMesh`. If capping produces a closed
non-orientable surface, validation must still fail; no false success.

Closed non-orientable surfaces such as a Klein bottle are not embeddable as a
single orientable shell in 3D. They are reported as unsupported unless a future
solidify/thickness operation is added.

### D4: Order and integration

```text
cleanup -> topology repair -> orientation -> caps -> validate
```

In Fabricate, topology repair is an option under Repair. When enabled, it runs
before 5E caps/orientation. The report shows non-manifold splits, seam cuts,
duplicated vertices, shells and any remaining topology errors.

### D5: Validation

The result must pass `validateMesh` including manifold, orientation and
self-intersection checks. Topology repair never bypasses validation and never
silently removes geometry unless `remove` was explicitly selected.

## Test matrix

- Two tetrahedra sharing an edge: split into two manifold shells with the same
  total volume.
- Three or more faces sharing an edge: fan split or explicit removal.
- Two cubes sharing a face after welding: non-manifold edge behavior.
- Möbius strip: non-orientable detection; cut yields an orientable open patch;
  reject yields a structured error.
- Klein-like closed non-orientable fixture: rejected as unsupported.
- Clean manifold mesh: unchanged.
- Determinism and input immutability.
- E2E repair off fails, topology split enables orientation/cap/export.
