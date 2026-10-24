## 1. Shared parameter helpers and model (~2 h)

- [x] 1.1 Extract `src/lab/parameters.js`; refactor sensitivity to use it.
- [x] 1.2 Add `src/lab/exploration.js`: selection, locks, Solo, 1D sweep, seeded randomize.
- [x] 1.3 Unit tests: endpoints, deterministic sweeps/randomize, lock isolation, Solo semantics, locked selection rejection, empty selection.
  - Verify: group 16 in `test/lab.smoke.mjs`.

## 2. Preview pipeline (~1 h)

- [x] 2.1 Add `src/render/thumbnail.js`: plain-canvas rendering with shared bounds.
- [x] 2.2 Add `App.adoptCandidate()` through `adoptDocument` and history.
  - Verify: unit model + e2e adopt.

## 3. Explore panel (~2 h)

- [x] 3.1 Add axis/steps selectors, intensity, scope details, Solo/Lock controls and status.
- [x] 3.2 Generate strip, evaluate candidates, render thumbnails, skip invalid candidates.
- [x] 3.3 Adopt on click; report errors without breaking the panel.
- [x] 3.4 Add section and styles.
  - Verify: e2e strip/adopt and locked randomize.

## 4. Verification and docs (~1 h)

- [x] 4.1 Run `npm test`, `npm run build`, `npm run test:e2e`; record counts.
- [x] 4.2 Update README/SPEC/roadmap/architecture with the slice and counts.
- [x] 4.3 Validate and archive `explore-1d`; confirm `lab-exploration-panel` spec exists.

## Verification results

- `npm test`: **755/755 checks** (group 16 added).
- `npm run build`: succeeds; bundle warning unchanged.
- `npm run test:e2e`: **37/37 tests**, including strip adoption and locked
  randomisation.
- `openspec change validate explore-1d`: valid.
