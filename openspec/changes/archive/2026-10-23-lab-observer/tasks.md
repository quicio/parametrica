## 1. Pure hash and descriptor (~2 h)

- [x] 1.1 Add `src/lab/hash.js`: canonical JSON + pure SHA-256; test known vectors and key-order stability.
- [x] 1.2 Add `src/lab/descriptor.js`: bbox, area, perimeter, compactness, centroid, symmetry, curvature, inflections, crossings, Fourier, complexity, coverage, topology, document hash.
- [x] 1.3 Unit fixtures: circle metrics, hexagon symmetry, two disjoint curves, degenerate geometry; hash determinism.
  - Verify: group 14 in `test/lab.smoke.mjs`.

## 2. Sensitivity (~1 h)

- [x] 2.1 Add `src/lab/sensitivity.js`: numeric parameter refs, ±delta central perturbation, candidate evaluation, symmetric Chamfer shape distance, ranking.
- [x] 2.2 Tests: deterministic report, sorted impact, inert parameter, modifier skip, candidate documents not adopted.
  - Verify: group 14 assertions.

## 3. App orchestration (~1 h)

- [x] 3.1 Add `App.analyzeFigure({ sensitivity })` returning descriptor + optional report; store `lastAnalysis`.
- [x] 3.2 Schedule automatic metrics 300 ms after a stable commit; suppress during animation; leave explicit analysis available.
- [x] 3.3 Ensure analysis does not mutate the document or history.
  - Verify: unit + e2e; history snapshot unchanged after analysis.

## 4. Panel and parameter docs (~2 h)

- [x] 4.1 Add `src/ui/widgets/LabPanel.js`: metrics grid, influence list, status/live region, Analyze influence button, empty/error states.
- [x] 4.2 Add the Analysis section to `Controls` and wire it to `App.analyzeFigure`.
- [x] 4.3 Attach `schema.doc` as tooltip/aria description to generator and operator controllers; add expression label titles.
- [x] 4.4 Add panel styles (metrics, bars, status) consistent with the instrument look.
  - Verify: e2e panel, tooltip, formatting.

## 5. Verification and docs (~1 h)

- [x] 5.1 Run `npm test`, `npm run build`, `npm run test:e2e`; record counts.
- [x] 5.2 Update README/SPEC/roadmap with the observer slice and counts.
- [x] 5.3 Run `openspec validate lab-observer` and archive the change.
  - Verify: all green; change archived; `openspec/specs/lab-observer-panel` exists.

## Verification results

- `npm test`: **711/711 checks** (group 14 added).
- `npm run build`: succeeds; bundle warning unchanged.
- `npm run test:e2e`: **32/32 tests**, including the analysis panel and
  parameter-documentation checks.
- `openspec validate lab-observer`: valid.
