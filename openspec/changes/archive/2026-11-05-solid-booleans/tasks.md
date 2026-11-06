## 1. Core CSG

- [x] 1.1 Add `booleanSolids(operation, operands, options)` with the documented
      result contract.
- [x] 1.2 Implement deterministic BSP build, split and operation traversal.
- [x] 1.3 Classify coplanar/front/back/spanning polygons with tolerance.
- [x] 1.4 Convert result polygons to triangles, weld and remove degenerate or
      duplicate faces.
- [x] 1.5 Enforce input, depth and polygon limits with structured errors.
- [x] 1.6 Revalidate non-empty results with `validateMesh`.

## 2. Operand and result validation

- [x] 2.1 Reject open, non-manifold, inconsistent, self-intersecting,
      degenerate and non-finite operands.
- [x] 2.2 Normalize zero-volume results to explicit empty.
- [x] 2.3 Record operation, operands, tolerance, splits, depth and triangle
      counts.
- [x] 2.4 Guarantee positive volume and outward orientation for non-empty
      results.

## 3. Fabrication and UI

- [x] 3.1 Add sanitized `view.fabrication.boolean`, default `none`.
- [x] 3.2 Apply the recipe after scope selection and per-body validation.
- [x] 3.3 Reject invalid/empty/complex results without fallback to multi-body.
- [x] 3.4 Add None/Union/Difference/Intersection controls and result reporting.
- [x] 3.5 Disable difference/intersection with fewer than two valid bodies.

## 4. Tests

- [x] 4.1 Cube matrix: overlapping, shared-face, disjoint, self-subtraction,
      containment and near-coplanar cases.
- [x] 4.2 Tessellated-sphere union/difference/intersection volume within 2%.
- [x] 4.3 Determinism: repeated geometry JSON and STL bytes.
- [x] 4.4 Invalid operands and complexity limits return structured errors.
- [x] 4.5 Fabrication/e2e: union, difference, disjoint-intersection empty,
      controls disabled and render geometry unchanged.

## 5. Acceptance

- [x] 5.1 Document BSP limits, emptiness, operand order and no-repair boundary.
- [x] 5.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- Union, difference and intersection work on validated solids.
- Coplanar/touching and empty results are deterministic and explicit.
- Invalid results never reach STL export.
- Single-body and multi-body behavior remain unchanged when boolean is `none`.
- No direct editing, implicit repair, CSG dependency or 3MF.
