## Context

The geometry layer has validated Mesh/Solid contracts, deterministic
tessellation, explicit preparation (weld/cap), self-intersection diagnostics
and multi-body selection. It does not have a boolean engine. Phase 5D must add
one without weakening the validation gate or mutating render geometry.

## Decisions

### D1: Pure CSG core

Add `src/geometry/csg.js` with:

```js
booleanSolids(operation, operands, {
  tolerance = 1e-6,
  maxDepth = 64,
  maxPolygons = 250_000,
  maxInputTriangles = 50_000,
})
```

The function is DOM-free and does not import App, renderer or document code.

Return shape:

```js
// success
{
  ok: true,
  empty: false,
  geometry: Mesh,
  validation: ValidationResult,
  stats: {
    operation,
    operands,
    inputTriangles,
    outputTriangles,
    splits,
    depth,
    tolerance,
  },
}

// empty
{ ok: true, empty: true, geometry: null, validation: null, stats }

// failure
{ ok: false, empty: false, geometry: null, error: { code, message }, stats }
```

Failure codes: `invalid-operation`, `invalid-operand`, `non-finite`,
`self-intersecting-operand`, `complexity`, `degenerate-result`,
`invalid-result`.

### D2: Operand eligibility

Every operand must be a Mesh or a Solid whose boundary is a Mesh, and must pass
the existing `validateMesh` gate:

- closed, manifold and consistently oriented;
- no invalid indices, degenerate faces or non-finite vertices;
- no self-intersections;
- finite positive signed volume.

Open surfaces must be prepared/capped first. Booleans never tessellate a
Surface and never run preparation implicitly.

### D3: BSP algorithm

Use a BSP-based CSG pipeline:

1. Convert each operand's faces to convex polygons (triangles) with planes.
2. Build a BSP tree per operand with a deterministic polygon order.
3. Split polygons against the tree using an epsilon plane classification:
   - `COPLANAR`, `FRONT`, `BACK`, `SPANNING`.
   - Spanning polygons split along the plane.
   - Coplanar polygons are partitioned by normal direction.
4. Apply the operation:
   - union: remove interior faces from both operands;
   - difference: remove A inside B and invert B's contribution;
   - intersection: keep only faces inside the other operand.
5. Convert resulting convex polygons back to triangles with a stable fan.
6. Weld result vertices with the same tolerance.
7. Drop degenerate and duplicate coplanar faces.
8. Run `validateMesh` on the result.

Coplanar classification uses the tolerance. The implementation must not use
randomness, hash-map iteration order or floating-point accumulation order that
changes between runs.

### D4: Touching and coplanar faces

- Two cubes sharing a face: union produces one closed box; the shared internal
  face is removed.
- Difference with a coincident face removes the shared face and keeps a valid
  boundary.
- Intersection of face-touching cubes is an empty result (zero volume), not a
  degenerate mesh.
- Exact duplicate/coincident faces are collapsed only when they are opposite
  shell contributions; they are never silently kept as non-manifold geometry.

A result whose volume is within tolerance of zero is normalized to the explicit
empty result.

### D5: Empty results

- Disjoint intersection: `empty: true`.
- `A − A`: `empty: true`.
- Union/intersection with an empty operand set is rejected as
  `invalid-operand` (the API requires at least two operands).
- Empty is a success, not an error. Fabricate disables export and states
  `Boolean result is empty`.

### D6: Complexity limits

- Reject any operand over `maxInputTriangles`.
- Abort with `complexity` when BSP depth exceeds `maxDepth` or the intermediate
  polygon count exceeds `maxPolygons`.
- No partial result, no silent decimation.
- Defaults target fabrication-size meshes; limits are reported in the failure
  message.

### D7: Determinism and orientation

- Face order follows deterministic tree traversal and stable input order.
- Result winding follows the operation and the original operand orientation.
- Non-empty results must have positive signed volume.
- Repeated runs with the same inputs and tolerance must produce identical
  geometry JSON and identical STL bytes.

### D8: Fabrication recipe

Add `view.fabrication.boolean`:

```js
'none' | 'union' | 'difference' | 'intersection'
```

Default `none`. The operand order is the deterministic order of selected valid
bodies from the current scope (active layer or composition). `difference` means
first body minus the remaining bodies; `intersection` intersects all.

- `none` keeps 5A–5C behavior.
- `union`: one result body; empty operands fall back to no source.
- `difference`/`intersection`: at least two valid bodies are required.
- The result is validated again and replaces the multi-body source.
- A failed boolean disables export with the structured error; it does not fall
  back silently to overlapping shells.
- The boolean is derived only; render meshes and document layers are unchanged.

### D9: Units and tolerance

Booleans operate in world coordinates. Tolerance is in world units and is never
converted to millimetres. Physical scale is applied only by the STL exporter.

## Test matrix

### Core volumes (exact where possible)

- Two overlapping unit cubes: union, difference, intersection volumes.
- Two cubes sharing a face: union volume 16, one closed shell.
- Two disjoint cubes: union volume 16 with two shells; intersection empty.
- `cube − cube`: empty.
- Cube minus a fully containing cube: empty.
- Cube minus a partially overlapping cube: expected volume.
- Coplanar offset cubes: no internal faces, no non-manifold edges.
- Near-coplanar faces within/outside tolerance: deterministic classification.

### Tessellated sphere

- Sphere ∪ cube, sphere ∩ cube, sphere − cube.
- Volume within 2% of the analytic expectation for a sufficiently tessellated
  sphere.
- Result validates and exports to STL.
- Repeated runs are byte-identical.

### Invalid inputs

- Open mesh, non-manifold mesh, inconsistent orientation, self-intersecting
  mesh, non-finite vertex and degenerate face are rejected with structured
  codes.
- An empty operand set and an unknown operation are rejected.
- Complexity limits return `complexity` without partial geometry.

### Fabrication/e2e

- Union of two overlapping composition bodies yields one body and a valid STL.
- Difference produces a lower volume than union.
- Disjoint intersection disables export with `empty`.
- Boolean controls are disabled when fewer than two valid bodies are selected.
- Render geometry, SurfaceMapping, SVG/PNG and document layers remain
  unchanged.

## Risks / Trade-offs

- BSP CSG is numerically fragile on near-coplanar and highly tessellated
  surfaces.
- Triangle count can grow quickly; complexity limits are mandatory.
- Difference is order-dependent; the spec uses deterministic selection order
  and documents it.
- The result is a mesh, not a BREP; tiny slivers may require separate repair.
- The engine is not a substitute for advanced repair (5E).
