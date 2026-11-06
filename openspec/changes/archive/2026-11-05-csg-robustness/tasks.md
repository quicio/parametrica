## 1. Strategy layer

- [x] 1.1 Add strategy selection and stats to `booleanSolids`.
- [x] 1.2 Implement scale-aware tolerance and coordinate normalization.
- [x] 1.3 Add deterministic convexity/condition estimator for auto.
- [x] 1.4 Preserve the BSP regression behavior.

## 2. Remesh fallback

- [x] 2.1 Build a deterministic signed-distance grid.
- [x] 2.2 Extract and weld an iso-surface.
- [x] 2.3 Validate and report resolution/volume delta.
- [x] 2.4 Enforce resolution/triangle/time budgets.

## 3. Integration and tests

- [x] 3.1 Add `view.fabrication.csgStrategy` and UI.
- [x] 3.2 Show strategy/fallback report rows.
- [x] 3.3 Keep render geometry unchanged.
- [x] 3.4 Regression: cube/sphere matrix and determinism.
- [x] 3.5 Robustness: overlapping tori, spheres, torus+cube and volume
      consistency.
- [x] 3.6 Performance budgets and E2E overlapping tori.
- [x] 3.7 Document limits and run full gates.

## Acceptance criteria

- Overlapping full-resolution tori produce valid union/difference/intersection.
- Cube/sphere regression remains unchanged.
- Fallbacks and budgets are explicit.
- Invalid results never export.
- No exact BREP promise, no new dependency without approval, no UI redesign.
