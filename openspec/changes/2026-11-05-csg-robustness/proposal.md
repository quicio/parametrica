## Why

The first CSG engine works on the cube/sphere matrix and disjoint/nested
compositions, but highly non-convex overlapping solids can produce excessive
BSP splitting, T-junctions and `invalid-result`. Phase 6D makes CSG robust
enough for forms such as overlapping tori without weakening validation.

## What Changes

- Add a CSG strategy selector: `bsp`, `surface`, `remesh`, `auto`.
- Keep the current BSP engine as the convex/default path.
- Add surface-based triangle intersection, splitting and winding
  classification for non-convex operands.
- Add a deterministic remesh fallback for pathological cases.
- Use adaptive tolerance derived from coordinate magnitude and mesh scale.
- Integrate CSG repair: T-junction resolution, orientation and validation.
- Report strategy, fallbacks, splits, timing and volume delta.
- Expose strategy and budgets in Fabricate.
- Keep the cube/sphere matrix as a regression gate.

## Capabilities

### New Capabilities

- `csg-robustness`: strategy-driven robust CSG.

### Modified Capabilities

- `solid-booleans`: strategies, fallbacks and reporting.
- `fabrication-contracts`: robust CSG results still pass validation.
- `make-workspace`: CSG strategy controls.

## Impact

- `src/geometry/csg.js`
- new `src/geometry/csgSurface.js` / remesh helper
- Fabricate panel
- Unit/e2e tests and docs

## Non-goals

- No exact BREP kernel.
- No guaranteed manifold output for arbitrary pathological inputs.
- No 3MF changes.
- No self-intersection repair outside CSG.
- No new runtime dependency unless separately approved.
