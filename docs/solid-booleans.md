# Solid booleans (CSG)

Phase 5D adds deterministic union, difference and intersection for validated
closed Mesh/Solid operands. The engine is a pure, DOM-free BSP implementation
and is exposed as an explicit Fabricate recipe.

## API

```js
booleanSolids(operation, operands, {
  tolerance = 1e-4,
  maxDepth = 4096,
  maxPolygons = 250_000,
  maxInputTriangles = 50_000,
})
```

Operations: `union`, `difference`, `intersection`.

Result shapes:

```js
// success
{ ok: true, empty: false, geometry, validation, stats }

// empty
{ ok: true, empty: true, geometry: null, validation: null, stats }

// failure
{ ok: false, geometry: null, error: { code, message }, stats }
```

Failure codes: `invalid-operation`, `invalid-operand`,
`self-intersecting-operand`, `complexity`, `invalid-result`.

## Operand rules

- Mesh or Solid with a Mesh boundary.
- Closed, manifold, consistently oriented.
- No invalid indices, degenerate faces or non-finite vertices.
- No self-intersections.
- Finite positive signed volume.

Surfaces are rejected: tessellate and prepare them first (5A/5B).

## Algorithm

1. Convert faces to convex triangle polygons with Newell planes.
2. Build a BSP tree with deterministic plane selection.
3. Split polygons with `COPLANAR`, `FRONT`, `BACK` and `SPANNING` classes.
4. Apply the union, difference or intersection traversal.
5. Triangulate the result with a stable fan.
6. Weld vertices at the booleans tolerance.
7. Remove duplicate/opposite coplanar faces.
8. Resolve T-junctions introduced by BSP splits.
9. If the result is still open/non-manifold, run one more edge-split and
   dedupe pass.
10. Revalidate; normalize zero-volume results to `empty`.

T-junction resolution is what lets BSP output satisfy the strict edge-pairing
validator. Without it, overlapping cubes produce matching topology but
unmatched split edges.

## Tolerance and limits

- Default tolerance: `1e-4` world units. It is used for plane classification,
  welding, and T-junction detection.
- `maxDepth` defaults to `4096`; convex meshes can produce deep BSP chains, so
  the limit is intentionally high but bounded.
- `maxInputTriangles` defaults to `50_000`.
- `maxPolygons` defaults to `250_000`.
- Limits return a `complexity` error; no partial geometry is returned.

## Coplanar and empty cases

- Cubes sharing a face union into one closed box; the internal face is removed.
- Face-touching intersection is empty.
- `A − A`, contained subtraction and disjoint intersection are explicit empty
  results.
- Duplicate opposite faces are cancelled; duplicate same-orientation faces are
  kept once.
- A result within the volume epsilon is treated as empty, not as a degenerate
  mesh.

## Fabricate recipe

`view.fabrication.boolean`:

```js
'none' | 'union' | 'difference' | 'intersection'
```

- Default `none`.
- Only available with `active-layer` or `composition` scope.
- Operand order is the deterministic order of selected valid bodies.
- `difference` is first body minus the rest.
- Fewer than two valid bodies disables difference/intersection.
- Empty or failed results disable export with an explicit reason.
- No fallback to overlapping-shell multi-body output.

## Verification

- Cube matrix: overlap, shared face, disjoint, containment, self-subtraction,
  volumes and determinism.
- Sphere: self-union/self-intersection volume within 2%, self-difference empty,
  sphere+cube union valid.
- Fabrication: union/difference volumes, empty intersection, two-body guard,
  STL bytes and render geometry unchanged.
- E2E: explicit union, difference and empty intersection through Fabricate.

## Known limits

- BSP CSG is numerically fragile on highly non-convex overlapping meshes.
  Overlapping full-resolution tori can return `invalid-result` instead of a
  fabricated body. The engine reports the failure and never exports it.
- The validated path covers convex solids, disjoint/nested compositions and the
  cube/sphere matrix. Non-convex overlap robustness belongs to a later repair
  slice.
- No implicit repair, no CSG dependency, no 3MF and no per-body materials.
