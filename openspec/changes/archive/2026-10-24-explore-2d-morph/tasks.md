## 1. Core

- [x] 1.1 Add `grid2D` to `ExplorationSession` with caps and deterministic order.
- [x] 1.2 Add `morph(a, b, {steps})` with structure checks and numeric interpolation.
  - Verify: unit group 17: dimensions/order/endpoints/illegal morph/budget.
- [x] 1.3 Add tests for determinism and candidate isolation.

## 2. UI

- [x] 2.1 Add 2D grid view with axis selectors and shared thumbnails.
- [x] 2.2 Add adopt-cell path through `App.adoptCandidate`.
- [x] 2.3 Add morph controls and frame strip.
- [x] 2.4 Show incompatible-structure explanation.
  - Verify: e2e grid adoption and morph endpoints.

## 3. Verification

- [x] 3.1 `npm test`, `npm run build`, `npm run test:e2e`.
- [x] 3.2 Update docs/roadmap.
- [x] 3.3 Validate and archive `explore-2d-morph`.

## Verification results

- `npm test`: **795/795 checks** (group 18 added).
- `npm run build`: succeeds; bundle warning unchanged.
- `npm run test:e2e`: **40/40 tests**, including grid adoption and morph
  endpoints.
- `openspec change validate explore-2d-morph`: valid.
