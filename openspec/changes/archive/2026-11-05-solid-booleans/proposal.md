## Why

Phase 5A–5C can prepare, validate and export one or more closed shells, but
there is no way to combine overlapping bodies. Users with intersecting forms
must choose between exporting overlapping shells (rejected) or leaving
Parametrica. Phase 5D adds a real 3D boolean engine for validated solids.

This is the highest-risk slice of Phase 5: coplanar faces, touching surfaces,
numerical tolerance and non-manifold intermediates can all produce invalid
results if the engine is naive. The change therefore starts with a pure,
DOM-free CSG core and a volume-based test matrix before exposing a narrow
Fabricate recipe.

## What Changes

- Add a pure `booleanSolids(operation, operands, options)` geometry API.
- Support `union`, `difference` and `intersection`.
- Require validated closed, manifold, oriented, self-intersection-free operands.
- Use a deterministic BSP-based split with an explicit epsilon, depth cap and
  polygon budget.
- Return either a validated result or a structured empty/failure result; never
  partial geometry.
- Revalidate the result with the existing mesh gate, including
  self-intersections.
- Add an explicit Fabricate boolean recipe: none, union, difference,
  intersection.
- Define operand order deterministically from the selected body order.
- Document emptiness (`A − A`, disjoint intersection), touching/coplanar cases
  and the fact that the result is not repaired.
- Add a CSG test matrix with cubes and tessellated spheres, plus determinism,
  tolerance and complexity tests.

## Capabilities

### New Capabilities

- `solid-booleans`: deterministic CSG operations over validated solids.

### Modified Capabilities

- `geometry-contracts`: boolean input/output contracts and explicit empty result.
- `fabrication-contracts`: boolean-derived sources must pass per-operand and
  result validation.
- `make-workspace`: explicit boolean recipe controls; direct editing remains out.

## Impact

- `src/geometry/csg.js`
- `src/geometry/validate.js` (reuse only; no validation weakening)
- `src/application/fabricationSource.js`
- `src/core/document.js` view metadata
- Fabricate panel
- Unit/volume tests and e2e
- Documentation

## Non-goals

- No direct vertex/face editing.
- No implicit repair or hole filling.
- No NURBS/BREP booleans; operands are indexed triangle meshes.
- No 3MF or per-body material metadata.
- No UI for reordering operands beyond the deterministic selection order.
- No new dependency.
