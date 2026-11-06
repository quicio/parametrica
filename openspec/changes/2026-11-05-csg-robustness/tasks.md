## 1. Strategy layer

- [ ] 1.1 Add strategy selection and stats to `booleanSolids`.
- [ ] 1.2 Implement scale-aware tolerance and coordinate normalization.
- [ ] 1.3 Add deterministic convexity/condition estimator for auto.
- [ ] 1.4 Preserve the BSP regression behavior.

## 2. Surface CSG

- [ ] 2.1 Compute triangle intersection segments/surfaces.
- [ ] 2.2 Split and retriangulate intersecting triangles.
- [ ] 2.3 Classify fragments with winding/parity.
- [ ] 2.4 Handle coplanar overlap via plane projection.
- [ ] 2.5 Stitch, weld, resolve T-junctions, orient and validate.

## 3. Remesh fallback

- [ ] 3.1 Build a deterministic signed-distance grid.
- [ ] 3.2 Extract and weld an iso-surface.
- [ ] 3.3 Validate and report resolution/volume delta.
- [ ] 3.4 Enforce resolution/triangle/time budgets.

## 4. Integration and tests

- [ ] 4.1 Add `view.fabrication.csgStrategy` and UI.
- [ ] 4.2 Show strategy/fallback report rows.
- [ ] 4.3 Keep render geometry unchanged.
- [ ] 4.4 Regression: cube/sphere matrix and determinism.
- [ ] 4.5 Robustness: overlapping tori, spheres, torus+cube, volume vs Monte
      Carlo within 2%.
- [ ] 4.6 Performance budgets and E2E overlapping tori.
- [ ] 4.7 Document limits and run full gates.

## Acceptance criteria

- Overlapping full-resolution tori produce valid union/difference/intersection.
- Cube/sphere regression remains unchanged.
- Fallbacks and budgets are explicit.
- Invalid results never export.
- No exact BREP promise, no new dependency without approval, no UI redesign.
