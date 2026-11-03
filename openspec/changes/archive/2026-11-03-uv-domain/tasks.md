## 1. Domain model

- [x] 1.1 Add `summarizeSurfaceDomain` with real bounds, reversal, closure,
      seams and sample counts.
- [x] 1.2 Add active visible surface resolution.
  - Verify: non-normalized and reversed domains, invalid/missing domains,
    planar and hidden active layers, geometry/frame/bbox immutability.

## 2. Inset

- [x] 2.1 Add the compact DOM/SVG UV Domain inset.
- [x] 2.2 Add U/V arrows, low-density grid, bounds, samples and seam cues.
- [x] 2.3 Add Canvas toggle with persisted UI-only visibility.
- [x] 2.4 Hide when no valid surface is active.
  - Verify: e2e toggle, real bounds, hidden on planar layer and SVG exclusion.

## 3. Docs and acceptance

- [x] 3.1 Document the inset, domain contract and limitations.
- [x] 3.2 Run `npm run check`, `npm run test:e2e`, strict OpenSpec validation
      and archive.

## Acceptance criteria

- The inset uses the real `Surface.domain`, not hardcoded ranges.
- U/V bounds, orientation, grid, samples and closure/seam state are visible.
- Reversed domains retain their real direction.
- No inset appears without a valid active Surface.
- Geometry, ViewTransform, frame, bbox, Spatial Reference and exports are
  unchanged.
- UV ↔ XYZ, units, snapping, CAD and UV export remain out of scope.


## Verification results

- `npm run check`: lint, **1773/1773** unit checks and production build pass.
- `npm run test:e2e`: **109/109** Playwright tests pass.
- `openspec validate --changes --strict`: pass.
- Unit coverage: real and non-normalized U/V bounds, reversed domains, actual
  grid sample counts, closure/seam metadata, invalid domains, planar/hidden
  active layers, active-surface resolution, geometry/frame/bbox immutability
  and SVG exclusion.
- E2E coverage: Canvas toggle, inset visibility, real bounds and min/max data,
  hidden state on a planar layer, unchanged bbox/artboard rect and SVG without
  UV markup.
- Manual visual check: Torus and Sphere insets show bounded domain charts,
  closure/seam state and sample counts.
- Known limits: no UV ↔ XYZ interaction, no surface iso-line overlay, no UV
  export, no units/snapping/CAD, first valid surface only when multiple exist.
